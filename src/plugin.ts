import { PathCommand, Shape, Path } from "@penpot/plugin-types";

penpot.ui.open("Metaball", `?theme=${penpot.theme}`, {
  width: 320,
  height: 340,
});

let lastNodes: Shape[] = [];
let selectedNodes: Shape[] = [];
let currentArtboard: Shape | null = penpot.root;

penpot.ui.onMessage((msg: any) => {
  if (msg?.pluginMessage?.type === "create-metaball") {
    const blockId = penpot.history.undoBlockBegin();
    const nodes = penpot.selection;
    if (nodes.length < 2) {
      return;
    }

    let selectedNodesInLastNodes: boolean = false;
    if (selectedNodes && Array.isArray(selectedNodes)) {
      selectedNodesInLastNodes = nodes.every((node) =>
        selectedNodes.map((n) => n.id).includes(node.id)
      );
    }

    selectedNodes = nodes;

    if (selectedNodesInLastNodes) {
      lastNodes.forEach((element) => {
        if (element && element?.id) {
          element.remove();
        }
      });
    }

    lastNodes = [];
    let rate: number = msg.pluginMessage.rate || 50;
    let handleSize: number = msg.pluginMessage.handleSize || 24;
    let appearance: string = "Half";
    let index = 1;

    for (let i = nodes.length - 1; i >= 1; i--) {
      for (let j = i - 1; j >= 0; j--) {
        if (nodes[i].type === "ellipse" && nodes[j].type === "ellipse") {
          let txi = nodes[i].x;
          let tyi = nodes[i].y;
          let txj = nodes[j].x;
          let tyj = nodes[j].y;
          let metaballObj = metaball(
            nodes[i].width / 2,
            nodes[j].width / 2,
            [txi + nodes[i].width / 2, tyi + nodes[i].width / 2],
            [txj + nodes[j].width / 2, tyj + nodes[j].width / 2],
            handleSize / 10,
            rate / 100,
            appearance,
            true
          );
          if (nodes[i].parent?.id !== nodes[j].parent?.id) {
            currentArtboard = penpot.root;
          } else {
            currentArtboard = nodes[i]?.parent;
          }
          if (metaballObj) {
            let path;
            if (lastNodes[index - 1] && lastNodes[index - 1].id) {
              path = lastNodes[index - 1] as Path;
            } else {
              path = penpot.createPath();
              lastNodes.push(path);
            }

            const layer: any = nodes[i];

            path.content = metaballObj as PathCommand[];
            path.name = "MetaballShape" + (nodes.length > 2 ? index : "");
            path.fills = layer.fills;
            path.strokes = layer.strokes;

            if (
              currentArtboard &&
              (currentArtboard.type === "board" ||
                currentArtboard.type === "group" ||
                currentArtboard.type === "boolean")
            ) {
              currentArtboard?.insertChild(
                currentArtboard.children.length + 1,
                path
              );
            }
            index++;
          }
        }
      }
    }
    penpot.history.undoBlockFinish(blockId);
  }
  if (msg?.pluginMessage?.type === "union") {
    if (lastNodes.length > 0 && selectedNodes.length > 0) {
      const blockId = penpot.history.undoBlockBegin();
      const booleanNodes: Shape[] = [];
      selectedNodes.forEach((element) => {
        if (element && element?.id) {
          booleanNodes.push(element);
        }
      });
      lastNodes.forEach((element) => {
        if (element && element?.id) {
          booleanNodes.push(element);
        }
      });
      const newBooleanShape = penpot.createBoolean("union", booleanNodes);
      if (newBooleanShape) {
        newBooleanShape.name = "Metaball";
      }
      penpot.history.undoBlockFinish(blockId);
    }
  }
});

penpot.on("themechange", (theme) => {
  penpot.ui.sendMessage({
    type: "theme",
    content: theme,
  });
});

penpot.on("selectionchange", () => {
  const selectedShapes = penpot.selection;

  if (
    selectedNodes.length > 1 &&
    selectedShapes.map((node) => node.id).toString() !==
      selectedNodes.map((node) => node.id).toString()
  ) {
    selectedNodes = [];
  }
});

/**
 * Based on Metaball script by SATO Hiroyuki
 * http://shspage.com/aijs/en/#metaball
 */
function metaball(
  radius1: number,
  radius2: number,
  center1: Array<number>,
  center2: Array<number>,
  handleSize = 2.4,
  v = 0.5,
  appearance = "Full",
  asPenpotPath = false
) {
  const HALF_PI = Math.PI / 2;
  const d = dist(center1, center2);
  const maxDist = radius1 + radius2 * 300;
  let u1, u2;

  if (
    radius1 === 0 ||
    radius2 === 0 ||
    d > maxDist ||
    d <= Math.abs(radius1 - radius2)
  ) {
    return "";
  }

  if (d < radius1 + radius2) {
    u1 = Math.acos(
      (radius1 * radius1 + d * d - radius2 * radius2) / (2 * radius1 * d)
    );
    u2 = Math.acos(
      (radius2 * radius2 + d * d - radius1 * radius1) / (2 * radius2 * d)
    );
  } else {
    u1 = 0;
    u2 = 0;
  }

  // All the angles
  const angleBetweenCenters = angle(center2, center1);
  const maxSpread = Math.acos((radius1 - radius2) / d);

  const angle1 = angleBetweenCenters + u1 + (maxSpread - u1) * v;
  const angle2 = angleBetweenCenters - u1 - (maxSpread - u1) * v;
  const angle3 =
    angleBetweenCenters + Math.PI - u2 - (Math.PI - u2 - maxSpread) * v;
  const angle4 =
    angleBetweenCenters - Math.PI + u2 + (Math.PI - u2 - maxSpread) * v;
  // Points
  const p1: Array<number> = getVector(center1, angle1, radius1);
  const p2: Array<number> = getVector(center1, angle2, radius1);
  const p3: Array<number> = getVector(center2, angle3, radius2);
  const p4: Array<number> = getVector(center2, angle4, radius2);

  // Define handle length by the
  // distance between both ends of the curve
  const totalRadius = radius1 + radius2;
  const d2Base = Math.min(v * handleSize, dist(p1, p3) / totalRadius);

  // Take into account when circles are overlapping
  const d2 = d2Base * Math.min(1, (d * 2) / (radius1 + radius2));

  const r1 = radius1 * d2;
  const r2 = radius2 * d2;

  const h1 = getVector(p1, angle1 - HALF_PI, r1);
  const h2 = getVector(p2, angle2 + HALF_PI, r1);
  const h3 = getVector(p3, angle3 + HALF_PI, r2);
  const h4 = getVector(p4, angle4 - HALF_PI, r2);

  if (asPenpotPath) return metaballToPenpotPath(p1, p2, p3, p4, h1, h2, h3, h4);
  return metaballToPath(
    p1,
    p2,
    p3,
    p4,
    h1,
    h2,
    h3,
    h4,
    d > radius1,
    radius2,
    radius1,
    appearance
  );
}

function metaballToPenpotPath(
  p1: Array<number>,
  p2: Array<number>,
  p3: Array<number>,
  p4: Array<number>,
  h1: Array<number>,
  h2: Array<number>,
  h3: Array<number>,
  h4: Array<number>
) {
  return [
    { command: "M", params: { x: p1[0], y: p1[1] } },
    {
      command: "C",
      params: {
        x: p3[0],
        y: p3[1],
        c1x: h1[0],
        c1y: h1[1],
        c2x: h3[0],
        c2y: h3[1],
      },
    },
    { command: "L", params: { x: p4[0], y: p4[1] } },
    {
      command: "C",
      params: {
        x: p2[0],
        y: p2[1],
        c1x: h4[0],
        c1y: h4[1],
        c2x: h2[0],
        c2y: h2[1],
      },
    },
    { command: "Z" },
  ];
}

function metaballToPath(
  p1: Array<number>,
  p2: Array<number>,
  p3: Array<number>,
  p4: Array<number>,
  h1: Array<number>,
  h2: Array<number>,
  h3: Array<number>,
  h4: Array<number>,
  escaped: boolean,
  r: number,
  r1: number,
  appearance: string
) {
  if (appearance == "Half") {
    return ["M", p1, "C", h1, h3, p3, "L", p4, "C", h4, h2, p2, "Z"].join(" ");
  } else {
    return [
      "M",
      p1,
      "C",
      h1,
      h3,
      p3,
      "A",
      r,
      r,
      0,
      escaped ? 1 : 0,
      0,
      p4,
      "C",
      h4,
      h2,
      p2,
      "A",
      r1,
      r1,
      0,
      escaped ? 1 : 0,
      0,
      p1,
    ].join(" ");
  }
}

function dist([x1, y1]: Array<number>, [x2, y2]: Array<number>) {
  return ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5;
}

function angle([x1, y1]: Array<number>, [x2, y2]: Array<number>) {
  return Math.atan2(y1 - y2, x1 - x2);
}

function getVector([cx, cy]: Array<number>, a: number, r: number) {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
