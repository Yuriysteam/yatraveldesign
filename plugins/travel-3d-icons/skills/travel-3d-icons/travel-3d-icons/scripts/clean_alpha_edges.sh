#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CACHE_DIR="${TMPDIR:-/tmp}/travel-3d-icons-swift-cache"
mkdir -p "$CACHE_DIR"

SWIFT_MODULECACHE_PATH="$CACHE_DIR" \
CLANG_MODULE_CACHE_PATH="$CACHE_DIR" \
exec swift "$SCRIPT_DIR/clean_alpha_edges.swift" "$@"
