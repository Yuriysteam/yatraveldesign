const trainsLayer = document.querySelector('#trains');
const map = document.querySelector('#metro-map');
const speedInput = document.querySelector('#speed');
const speedValue = document.querySelector('#speed-value');
const dotsVariant = new URLSearchParams(window.location.search).get('variant') !== 'trains';
document.body.classList.toggle('dots-variant', dotsVariant);
const namespace = 'http://www.w3.org/2000/svg';
const create = (name, attributes = {}) => {
  const element = document.createElementNS(namespace, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
};
const d3Path = 'M688 914.5C688 775.5 688 493.8 688 479C688 460.5 681 443 648.5 443C616 443 602 440 585 420.5C568 401 457.5 293.5 451.5 287.5C445.5 281.5 440 280.5 432.5 280.5C425 280.5 416 280 403.5 267.5C391 255 381.5 245.5 374.5 238.5C367.5 231.5 359.5 229 348.5 229C337.5 229 336 229 327.5 229C319 229 297 224.5 284.5 212C272 199.5 257 181.964 251 178.5C245 175.036 240.5 168 222 168C203.5 168 186.5 168 180 168C173.5 168 159 164 143.5 148.5C131.1 136.1 82 87 59 64M143.5 148.5C131.1 136.1 92 97 69 74';
const d3Bg = create('path', { id: 'd3-bg', d: d3Path, class: 'metro-line d3-bg' });
const d3Top = create('path', { id: 'line-d3', d: d3Path, class: 'metro-line d3-top' });
map.insertBefore(d3Bg, trainsLayer);
map.insertBefore(d3Top, trainsLayer);
const line15 = create('path', { id: 'line-15', d: 'M633.5 481C640.5 488 640 487.5 643 490.5C646 493.5 652 497 652 515.5C652 534 652 585 652 592.5C652 600 657 613 663.5 619C670 625 695.5 651 701 656.5C706.5 662 710.5 662.5 710.5 678C710.5 690.4 710.5 707.833 710.5 715', class: 'metro-line' });
map.insertBefore(line15, trainsLayer);
const line12 = create('path', { id: 'line-12', d: 'M322 833.5C327.167 833.5 339.6 833.5 348 833.5C358.5 833.5 371 841.5 371 859C371 873 371 924.167 371 948', class: 'metro-line' });
map.insertBefore(line12, trainsLayer);
const line8a = create('path', { id: 'line-8a', d: 'M700 325C650 374.5 546.5 477 532.5 491C515 508.5 508 514 478 514C454 514 438.667 514 434 514', class: 'metro-line' });
map.insertBefore(line8a, trainsLayer);

const lineColors = {
  'line-1': '#e40521',
  'line-2': '#4aaf4e',
  'line-3': '#0072bb',
  'line-4-a': '#35bdef',
  'line-4-b': '#35bdef',
  'line-5': '#915133',
  'line-6': '#ef7d00',
  'line-7': '#933e90',
  'line-8': '#ffdd04',
  'line-9': '#585f67',
  'line-10': '#bdd12d',
  'line-11': '#88cdcf',
  'line-12': '#adacac',
  'line-14': '#ef323e',
  'line-17': '#028368',
  'line-d1': '#f7a70b',
  'line-d2': '#e94282',
  'line-d3': '#ea5b0d',
  'line-15': '#f089b7',
  'line-16': '#bac8e8',
  'line-8a': '#ffdd04',
  'line-d4': '#46b384',
};

function drawTrain(lineId) {
  const group = create('g', { class: 'train', 'data-line': lineId });
  const train = dotsVariant
    ? create('circle', { r: .9, fill: ['line-8', 'line-8a', 'line-11'].includes(lineId) ? '#101113' : '#ffffff', class: 'train-dot' })
    : create('rect', { x: -2.5, y: -.5, width: 5, height: 1, rx: .5, fill: lineColors[lineId], class: 'train-blob' });
  group.append(train);
  trainsLayer.append(group);
  return group;
}

const animatedLines = ['line-1', 'line-2', 'line-3', 'line-4-a', 'line-4-b', 'line-5', 'line-6', 'line-7', 'line-8', 'line-8a', 'line-9', 'line-10', 'line-11', 'line-12', 'line-14', 'line-15', 'line-16', 'line-17', 'line-d1', 'line-d2', 'line-d3', 'line-d4'];
// SVG-геометрия неизменна: получаем её один раз, а в кадре берём точки из кэша.
const routeSampleStep = 1;
const routes = Object.fromEntries(animatedLines.map((lineId) => {
  const path = document.querySelector(`#${lineId}`);
  const length = path.getTotalLength();
  const sampleCount = Math.ceil(length / routeSampleStep);
  const sampleStep = length / sampleCount;
  const points = new Float32Array((sampleCount + 1) * 2);
  for (let index = 0; index <= sampleCount; index += 1) {
    const point = path.getPointAtLength(index * sampleStep);
    points[index * 2] = point.x;
    points[index * 2 + 1] = point.y;
  }
  return [lineId, { length, sampleCount, sampleStep, points }];
}));
// Координаты берём из именованных слоёв «… stops» в исходном макете Figma.
// Сами маркеры намеренно не добавляются в SVG.
const stationPoints = {
  'line-1': [[238.5,879],[206.5,847],[191.5,819],[191.5,802],[191.5,785],[191.5,761],[191.5,744],[191.5,728],[191.5,713],[204.5,679],[235.5,648],[252.5,595],[253.5,569],[264.5,537],[288.5,513],[337.5,500],[382.5,464],[406.5,440],[437.5,410],[450.5,396],[465.5,381],[489.5,357],[500.5,346],[533.5,313],[564,265],[564,240]],
  'line-2': [[658.5,847],[561.5,804],[594.5,804],[619.5,804],[512.5,780],[495.5,763],[459.5,727],[437.5,685],[437.5,642],[438.5,616],[438.5,561],[430.5,523],[382.5,474],[348.5,440],[322.5,414],[257.5,350],[227.5,320],[211.5,303],[190.5,263],[190.5,230],[190.5,216],[190.5,202],[190.5,174]],
  'line-3': [[104.5,519],[139.5,519],[190.5,519],[260.5,484],[291.5,484],[337.5,484],[382.5,484],[66.5,442],[494.5,440],[524.5,409],[66.5,404],[544.5,390],[582.5,352],[66.5,335],[621.5,308],[625.5,286],[66.5,265],[625.5,262],[625.5,236],[66.5,230],[66.5,198],[66.5,176]],
  'line-4-a': [[104.5,519],[113.5,510],[124.5,499],[337.5,492],[133.5,490],[148.5,481],[165.5,481],[207.5,481],[260.5,481],[309.5,472],[291.5,468]],
  'line-4-b': [[337.5,492],[260.5,481],[309.5,472],[291.5,468],[191.5,458],[144.5,443]],
  'line-5': [[384,577],[323,565],[438,560],[278,523],[488,499],[261,484],[494,440],[261,438],[289,380],[465,380],[426,351],[336,348]],
  'line-6': [[315.5,825],[315.5,804],[315.5,789],[315.5,775],[315.5,761],[315.5,724],[315.5,693],[315.5,676],[315.5,654],[314.5,614],[315.5,583],[322.5,565],[429.5,513],[448.5,460],[425.5,410],[426.5,352],[438.5,304],[439.5,242],[439.5,218],[439.5,180],[439.5,151],[439.5,134],[439.5,118]],
  'line-7': [[696.5,697],[696.5,679],[696.5,659],[688.5,608],[674.5,594],[626.5,587],[644.5,587],[554.5,566],[528.5,540],[488.5,500],[448.5,460],[268.5,430],[353.5,430],[406.5,430],[234.5,414],[203.5,383],[155.5,335],[135.5,314],[129.5,263],[129.5,246],[129.5,226],[129.5,204],[129.5,183]],
  'line-8': [[434.5,513],[488.5,512],[526.5,495],[588.5,434],[637.5,386],[662.5,361],[681.5,342],[699.5,324]],
  'line-8a': [[129,812],[129,797],[129,782],[129,760],[129,739],[129,689],[133,667],[145,652],[160,636],[182,615],[191,595],[191,567],[191,518],[191,462]],
  'line-9': [[377.5,864],[377.5,844],[377.5,826],[377.5,807],[377.5,789],[377.5,770],[377.5,746],[377.5,699],[377.5,675],[377.5,648],[377.5,598],[377.5,572],[354.5,531],[345.5,493],[358.5,440],[376.5,399],[331.5,343],[310.5,305],[309.5,275],[327.5,237],[349.5,215],[375.5,180],[377.5,154],[377.5,136],[377.5,117]],
  'line-10': [[626.5,796],[626.5,771],[626.5,755],[626.5,730],[618.5,710],[604.5,695],[587.5,678],[569.5,661],[533.5,626],[521.5,605],[521.5,547],[520.5,489],[482.5,441],[432.5,399],[383.5,393],[376.5,293],[377.5,268],[375.5,249],[349.5,215],[326.5,185],[319.5,168],[320.5,153],[320.5,139],[320.5,121],[320.5,105]],
  'line-11': [[383.5,740],[354.5,738],[433.5,734],[307.5,730],[459.5,727],[493.5,713],[257.5,712],[543.5,684],[204.5,679],[569.5,661],[159.5,636],[626.5,587],[125.5,582],[113.5,553],[104.5,519],[630.5,478],[98.5,453],[588.5,434],[99.5,422],[576.5,422],[544.5,390],[111.5,373],[500.5,346],[155.5,345],[219.5,345],[256.5,339],[310.5,305],[438.5,304],[376.5,293]],
  'line-12': [[370.5,947],[370.5,926],[370.5,911],[370.5,892],[370.5,873],[370.5,856],[322.5,832]],
  'line-15': [[710.5,713],[710.5,697],[710.5,679],[704.5,659],[669.5,624],[651.5,544],[651.5,508],[634.5,480]],
  'line-16': [[209.5,844],[228.5,826],[241.5,813],[250.5,798],[253.5,780],[253.5,751],[257.5,712],[285.5,684],[315.5,654],[333.5,635],[404.5,624]],
  'line-17': [[192.5,454],[144.5,406],[126.5,388],[111.5,373],[98.5,361]],
};
const allStationPoints = Object.entries(stationPoints).flatMap(([lineId, points]) => points.map(([x, y]) => ({ lineId, x, y })));
const isTransferStation = (lineId, x, y) => allStationPoints.some((point) => point.lineId !== lineId && Math.hypot(point.x - x, point.y - y) <= 4);
const stationDwell = (lineId, index, x, y) => {
  const variation = ((index * 7 + lineId.length * 3) % 5 - 2) * 300;
  return (isTransferStation(lineId, x, y) ? 9_000 : 5_400) + variation;
};
const stationDistances = Object.fromEntries(Object.entries(stationPoints).map(([lineId, points]) => {
  const route = routes[lineId];
  return [lineId, points.map(([x, y], index) => {
    let closest = 0;
    let bestDistance = Infinity;
    for (let index = 0; index <= route.sampleCount; index += 1) {
      const delta = (route.points[index * 2] - x) ** 2 + (route.points[index * 2 + 1] - y) ** 2;
      if (delta < bestDistance) { bestDistance = delta; closest = index * route.sampleStep; }
    }
    return { progress: Math.min(closest, route.length) / route.length, dwell: stationDwell(lineId, index, x, y) };
  }).sort((a, b) => a.progress - b.progress)];
}));
const easeBetweenStops = (value) => value < .5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2;
const ringLines = new Set(['line-5', 'line-11', 'line-14']);
function routeCurvePenalty(route, start, end) {
  const span = end - start;
  const samples = Math.max(2, Math.ceil(span * route.length / 14));
  let turn = 0;
  let previousAngle;
  for (let index = 0; index <= samples; index += 1) {
    const progress = (start + span * index / samples) % 1;
    const pointIndex = Math.min(route.sampleCount - 1, Math.floor(progress * route.length / route.sampleStep));
    const nextIndex = Math.min(route.sampleCount, pointIndex + 1);
    const angle = Math.atan2(route.points[nextIndex * 2 + 1] - route.points[pointIndex * 2 + 1], route.points[nextIndex * 2] - route.points[pointIndex * 2]);
    if (previousAngle !== undefined) {
      const delta = Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle));
      turn += Math.abs(delta);
    }
    previousAngle = angle;
  }
  return Math.min(.28, turn / Math.PI * .16);
}
function createStopPlan(lineId, stops, isCircle) {
  const points = isCircle ? stops : [{ progress: 0, dwell: 0 }, ...stops.filter((point) => point.progress > .002 && point.progress < .998), { progress: 1, dwell: 0 }];
  const route = routes[lineId];
  const legs = Array.from({ length: isCircle ? points.length : points.length - 1 }, (_, index) => {
    const start = points[index].progress;
    const next = isCircle && index === points.length - 1 ? { ...points[0], progress: points[0].progress + 1 } : points[index + 1];
    const end = next.progress;
    const length = end - start;
    const straightBoost = Math.min(.08, Math.max(0, length * route.length - 60) / 800 * .08);
    return { start, end, length, dwell: next.dwell, motionWeight: length * (1 + routeCurvePenalty(route, start, end) - straightBoost) };
  });
  return {
    isCircle,
    first: points[0].progress,
    legs,
    totalDwell: legs.reduce((sum, leg) => sum + leg.dwell, 0),
    totalWeight: legs.reduce((sum, leg) => sum + leg.motionWeight, 0),
  };
}
const stopPlans = Object.fromEntries(Object.entries(stationDistances).map(([lineId, stops]) => [lineId, createStopPlan(lineId, stops, ringLines.has(lineId))]));
function progressWithStops(time, duration, plan) {
  const { legs, totalDwell, totalWeight, isCircle, first } = plan;
  const motionDuration = Math.max(1, duration - totalDwell);
  let remaining = time;
  for (let index = 0; index < legs.length; index += 1) {
    const leg = legs[index];
    const legDuration = motionDuration * leg.motionWeight / totalWeight;
    if (remaining <= legDuration) return (leg.start + leg.length * easeBetweenStops(remaining / legDuration)) % 1;
    remaining -= legDuration;
    const isTerminal = !isCircle && (index === legs.length - 1 || index + 1 === 0);
    if (!isTerminal && remaining <= leg.dwell) return leg.end % 1;
    if (!isTerminal) remaining -= leg.dwell;
  }
  return isCircle ? first : 1;
}
const terminalStop = 12_000;
const oneWayMinutes = {
  'line-1': 66,
  'line-2': 61,
  'line-3': 65,
  'line-4-a': 21,
  'line-4-b': 12,
  'line-5': 28,
  'line-6': 55,
  'line-7': 57,
  'line-8': 21,
  'line-9': 60,
  'line-10': 65,
  'line-11': 86,
  'line-12': 16,
  'line-14': 88,
  'line-17': 15,
  'line-d1': 88,
  'line-d2': 123,
  'line-d3': 135,
  'line-15': 21,
  'line-16': 16,
  'line-8a': 14,
  'line-d4': 137,
};
const routeDuration = (lineId) => oneWayMinutes[lineId] * 60_000;
const cycleDuration = (lineId) => ringLines.has(lineId) ? routeDuration(lineId) : routeDuration(lineId) * 2 + terminalStop * 2;
const peakFleet = {
  'line-1': 66,
  'line-2': 50,
  'line-5': 32,
  'line-6': 50,
  'line-7': 60,
  'line-8': 21,
  'line-11': 86,
  'line-12': 11,
  'line-14': 35,
  'line-3': 65,
  'line-4-a': 11,
  'line-4-b': 6,
  'line-17': 10,
  'line-d1': 53,
  'line-d2': 57,
  'line-d3': 52,
  'line-15': 12,
  'line-16': 10,
  'line-8a': 8,
  'line-d4': 52,
};
const trains = animatedLines.flatMap((lineId, lineIndex) => {
  const count = peakFleet[lineId] ?? (lineId === 'line-9' ? 16 : 32);
  const cycle = cycleDuration(lineId);
  const lineShift = ((lineIndex * 0.61803398875) % 1) * cycle;
  return Array.from({ length: count }, (_, index) => {
    // Ровная сетка не даёт составам собираться в пачки, а небольшой
    // детерминированный сдвиг убирает искусственную синхронность остановок.
    const spacing = cycle / count;
    const stagger = Math.sin((index + 1) * 2.3999632297 + lineIndex) * spacing * 0.08;
    return {
      lineId,
      offset: (index + .5) * spacing + lineShift + stagger,
      direction: ringLines.has(lineId) && index % 2 === 1 ? -1 : 1,
    };
  });
}).map((config) => ({ ...config, element: drawTrain(config.lineId), lastAngle: 0 }));

let lastRender = 0;
let animationTime = 0;
let lastAnimationFrame;
let playbackRate = 1;
const updateSpeed = () => {
  playbackRate = Number(speedInput.value);
  speedValue.value = `${playbackRate.toFixed(1).replace('.', ',')}×`;
  speedValue.textContent = speedValue.value;
};
speedInput.addEventListener('input', updateSpeed);
function animate(time) {
  if (lastAnimationFrame === undefined) {
    lastAnimationFrame = time;
    animationTime = time;
  }
  if (time - lastRender < 32) {
    requestAnimationFrame(animate);
    return;
  }
  animationTime += (time - lastAnimationFrame) * playbackRate;
  lastAnimationFrame = time;
  lastRender = time;
  trains.forEach((train) => {
    const route = routes[train.lineId];
    const isCircle = ringLines.has(train.lineId);
    const journey = routeDuration(train.lineId);
    const phase = isCircle ? (animationTime + train.offset) % journey : (animationTime + train.offset) % cycleDuration(train.lineId);
    let progress = isCircle ? (train.direction === 1 ? phase / journey : 1 - phase / journey) : phase < journey ? phase / journey : phase < journey + terminalStop ? 1 : phase < journey * 2 + terminalStop ? 1 - (phase - journey - terminalStop) / journey : 0;
    const stopPlan = stopPlans[train.lineId];
    if (stopPlan) {
      if (isCircle) {
        progress = progressWithStops(phase, journey, stopPlan);
        if (train.direction === -1) progress = 1 - progress;
      } else if (phase < journey) {
        progress = progressWithStops(phase, journey, stopPlan);
      } else if (phase < journey + terminalStop) {
        progress = 1;
      } else if (phase < journey * 2 + terminalStop) {
        progress = 1 - progressWithStops(phase - journey - terminalStop, journey, stopPlan);
      } else {
        progress = 0;
      }
    }
    const distance = progress * route.length;
    const pointIndex = Math.min(route.sampleCount - 1, Math.floor(distance / route.sampleStep));
    const pointProgress = distance / route.sampleStep - pointIndex;
    const pointX = route.points[pointIndex * 2] + (route.points[(pointIndex + 1) * 2] - route.points[pointIndex * 2]) * pointProgress;
    const pointY = route.points[pointIndex * 2 + 1] + (route.points[(pointIndex + 1) * 2 + 1] - route.points[pointIndex * 2 + 1]) * pointProgress;
    if (isCircle || (progress > 0 && progress < 1)) {
      const neighbourIndex = Math.min(route.sampleCount, pointIndex + 1);
      train.lastAngle = Math.atan2(route.points[neighbourIndex * 2 + 1] - pointY, route.points[neighbourIndex * 2] - pointX) * 180 / Math.PI;
    }
    train.element.setAttribute('transform', `translate(${pointX} ${pointY}) rotate(${train.lastAngle})`);
  });
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
