"""Regression checks for dual publication; no Telegram calls or external Git pushes."""
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import bot


def skill(name, version='1.0.0'):
    return f'---\nname: {name}\nversion: {version}\ndescription: Test workflow\n---\n\nUse references/example.txt.\n'.encode()


def item(name, dependencies=None):
    result = {'id': name, 'name': name, 'version': 'v1.0', 'description': 'Test workflow'}
    if dependencies:
        result['dependencies'] = dependencies
    return result


class Repository:
    def __init__(self, root):
        self.root = Path(root)

    def read_json(self, name, fallback):
        path = self.root / name
        return json.loads(path.read_text()) if path.exists() else fallback

    def read_bytes(self, name):
        return (self.root / name).read_bytes()

    def files_below(self, prefix):
        return [str(p.relative_to(self.root)) for p in (self.root / prefix).rglob('*') if p.is_file()]

    def apply(self, files, removals=()):
        for name in removals:
            (self.root / name).unlink()
        for name, data in files.items():
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)


class MarketplaceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.repo = Repository(self.directory.name)

    def test_preserves_original_nested_skill_and_binary_resources(self):
        package = {'kit/writer/SKILL.md': skill('writer'),
                   'kit/writer/references/example.txt': b'example',
                   'kit/shared/icon.png': b'\x89PNG'}
        files = bot.codex_plugin_files(item('writer'), [('writer', package)])
        for name, content in package.items():
            self.assertEqual(files['plugins/writer/skills/writer/' + name], content)
        manifest = json.loads(files['plugins/writer/.codex-plugin/plugin.json'])
        self.assertTrue(manifest['version'].startswith('1.0.0+'))
        self.assertEqual(manifest['skills'], './skills/')

    def test_lowercase_skill_filename_is_discoverable_without_changing_archive_content(self):
        package = {'nested/skill.md': skill('writer')}
        files = bot.codex_plugin_files(item('writer'), [('writer', package)])
        self.assertEqual(files['plugins/writer/skills/writer/nested/SKILL.md'], package['nested/skill.md'])

    def test_bundle_keeps_sibling_and_shared_paths_and_never_runs_installer(self):
        package = {'kit/Skills/a/SKILL.md': skill('a'), 'kit/Skills/b/SKILL.md': skill('b'),
                   'kit/shared/data.txt': b'shared', 'kit/install.py': b'raise RuntimeError("do not execute")'}
        with patch('subprocess.run') as run:
            files = bot.codex_plugin_files(item('kit'), [('kit', package)])
        run.assert_not_called()
        self.assertEqual(len([n for n in files if n.endswith('/SKILL.md')]), 2)
        self.assertIn('plugins/kit/skills/kit/kit/shared/data.txt', files)

    def test_same_contents_have_same_version_and_dependency_changes_change_version(self):
        packs = [('writer', {'SKILL.md': skill('writer')})]
        def version(packs):
            return json.loads(bot.codex_plugin_files(item('writer'), packs)['plugins/writer/.codex-plugin/plugin.json'])['version']
        self.assertEqual(version(packs), version(packs))
        self.assertNotEqual(version(packs), version(packs + [('base', {'SKILL.md': skill('base')})]))

    def test_invalid_paths_and_missing_skills_stop_before_writes(self):
        for package in ({'../outside': b'x', 'SKILL.md': skill('a')}, {'/outside': b'x', 'SKILL.md': skill('a')}, {'README.md': b'none'}):
            with self.assertRaises(bot.UserError):
                bot.codex_plugin_files(item('a'), [('a', package)])
        with self.assertRaises(bot.UserError):
            bot.codex_plugin_files(item('../outside'), [('a', {'SKILL.md': skill('a')})])

    def test_first_publication_keeps_unrelated_marketplace_entries(self):
        foreign = {'name': 'external', 'source': {'source': 'url', 'url': 'https://example.test/repo'}}
        self.repo.apply({bot.MARKETPLACE_PATH: json.dumps({'name': 'travel-design', 'plugins': [foreign]}).encode()})
        files, _ = bot.skill_marketplace_changes(self.repo, [item('writer')], 'writer', {'SKILL.md': skill('writer')})
        entries = json.loads(files[bot.MARKETPLACE_PATH])['plugins']
        self.assertIn(foreign, entries)
        self.assertEqual(len(entries), 2)

    def test_name_conflict_and_malformed_catalog_do_not_overwrite(self):
        for catalog in ({'plugins': [{'name': 'a', 'source': './elsewhere'}]}, []):
            self.repo.apply({bot.MARKETPLACE_PATH: json.dumps(catalog).encode()})
            with self.assertRaises(bot.UserError):
                bot.skill_marketplace_changes(self.repo, [item('a')], 'a', {'SKILL.md': skill('a')})

    def test_updated_package_removes_obsolete_files_and_does_not_duplicate_entry(self):
        catalog = [item('writer')]
        files, removals = bot.skill_marketplace_changes(self.repo, catalog, 'writer', {'SKILL.md': skill('writer'), 'obsolete.txt': b'old'})
        self.repo.apply(files, removals)
        files, removals = bot.skill_marketplace_changes(self.repo, catalog, 'writer', {'SKILL.md': skill('writer', '1.1.0')})
        self.assertIn('plugins/writer/skills/writer/obsolete.txt', removals)
        self.assertEqual(len(json.loads(files[bot.MARKETPLACE_PATH])['plugins']), 1)

    def test_dependency_closure_is_bundled_and_existing_dependents_are_refreshed(self):
        catalog = [item('base'), item('writer', ['base'])]
        self.repo.apply({'skills/base/skill.zip': bot.make_zip({'SKILL.md': skill('base')}),
                         'skills/writer/skill.zip': bot.make_zip({'SKILL.md': skill('writer')})})
        files, removals = bot.skill_marketplace_changes(self.repo, catalog, 'writer', {'SKILL.md': skill('writer')})
        self.repo.apply(files, removals)
        self.assertEqual(files['plugins/writer/skills/base/SKILL.md'], skill('base'))
        old_version = json.loads(files['plugins/writer/.codex-plugin/plugin.json'])['version']
        files, _ = bot.skill_marketplace_changes(self.repo, catalog, 'base', {'SKILL.md': skill('base', '1.1.0')})
        self.assertEqual(files['plugins/writer/skills/base/SKILL.md'], skill('base', '1.1.0'))
        self.assertNotEqual(old_version, json.loads(files['plugins/writer/.codex-plugin/plugin.json'])['version'])

    def test_missing_or_cyclic_dependency_does_not_create_partial_files(self):
        for catalog in ([item('a', ['missing'])], [item('a', ['b']), item('b', ['a'])]):
            with self.assertRaises(bot.UserError):
                bot.skill_marketplace_changes(self.repo, catalog, 'a', {'SKILL.md': skill('a')})
        self.assertFalse((self.repo.root / bot.MARKETPLACE_PATH).exists())

    def test_delete_removes_only_generated_package_and_its_entry(self):
        catalog = [item('a'), item('b')]
        for name in ('a', 'b'):
            files, removed = bot.skill_marketplace_changes(self.repo, catalog, name, {'SKILL.md': skill(name)})
            self.repo.apply(files, removed)
        files, removed = bot.skill_marketplace_removal(self.repo, 'a')
        self.assertEqual([e['name'] for e in json.loads(files[bot.MARKETPLACE_PATH])['plugins']], ['b'])
        self.assertTrue(all(n.startswith('plugins/a/') for n in removed))
        self.assertEqual(bot.skill_marketplace_removal(self.repo, 'never-exported'), ({}, []))

    def test_real_git_publication_updates_both_formats_in_one_commit(self):
        root = self.repo.root
        remote = root / 'remote.git'
        work = root / 'work'
        work.mkdir()
        def git(*args):
            return subprocess.run(['git', '-C', str(work), *args], check=True, capture_output=True, text=True).stdout.strip()
        subprocess.run(['git', 'init', '--bare', str(remote)], check=True, capture_output=True)
        git('init', '-b', 'main')
        git('remote', 'add', 'origin', str(remote))
        (work / 'prototypes.json').write_text('[{"url":"unchanged/"}]')
        git('add', 'prototypes.json')
        git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-m', 'Initial')
        git('push', '-u', 'origin', 'main')
        instance = bot.Bot.__new__(bot.Bot)
        instance.settings = SimpleNamespace(git_worktree=str(work), branch='main', repository='owner/repo')
        instance.github = bot.GitRepository(instance.settings)
        instance.configure_menu = Mock()
        instance.monitor_publication = Mock(return_value=(True, None))
        instance.notify_team_publication = Mock()
        instance.notify_publication_result = Mock()
        initial_count = int(git('rev-list', '--count', 'HEAD'))
        raw = skill('smoke')
        with patch('bot.enrich_metadata', side_effect=lambda kind, name, description='': (name, description)):
            instance.publish_skill(1, 'SKILL.md', raw, {'id': 1, 'first_name': 'Test'}, Mock())
        self.assertEqual(int(git('rev-list', '--count', 'HEAD')), initial_count + 1)
        changed = set(git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').splitlines())
        self.assertIn('skills/smoke/skill.zip', changed)
        self.assertIn('skills/catalog.json', changed)
        self.assertIn(bot.MARKETPLACE_PATH, changed)
        self.assertIn('plugins/smoke/.codex-plugin/plugin.json', changed)
        self.assertEqual((work / 'prototypes.json').read_text(), '[{"url":"unchanged/"}]')
        self.assertEqual(git('status', '--porcelain'), '')
        self.assertEqual(instance.monitor_publication.call_args.args[1], git('rev-parse', 'HEAD'))
        instance.notify_team_publication.assert_called_once()
        instance.is_publisher = Mock(return_value=True)
        instance.send = Mock()
        instance.edit_message = Mock()
        published_item = instance.github.read_json('skills/catalog.json', [])[0]
        query = {'from': {'id': 1}, 'message': {'chat': {'id': 1}, 'message_id': 7},
                 'data': 'skdelete:confirm:' + instance.skill_delete_key(published_item)}
        instance.skill_delete_callback(query)
        self.assertEqual(int(git('rev-list', '--count', 'HEAD')), initial_count + 2)
        self.assertEqual(instance.github.read_json('skills/catalog.json', None), [])
        self.assertEqual(instance.github.read_json(bot.MARKETPLACE_PATH, None)['plugins'], [])
        self.assertFalse((work / 'skills/smoke/skill.zip').exists())
        self.assertFalse((work / 'plugins/smoke/.codex-plugin/plugin.json').exists())
        self.assertEqual((work / 'prototypes.json').read_text(), '[{"url":"unchanged/"}]')
        self.assertEqual(git('status', '--porcelain'), '')


if __name__ == '__main__':
    unittest.main()
