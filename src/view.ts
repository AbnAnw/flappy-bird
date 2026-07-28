import type { RunPath, State } from "./types";
import { Birb, Pipes, Viewport, interpY, pipeXAt } from "./util";

type RendererDeps = { getGhostRuns: () => RunPath[] };

export const createRenderer = ({ getGhostRuns }: RendererDeps) => {
  const svg = document.querySelector("#svgCanvas") as SVGSVGElement;
  svg.setAttribute("viewBox", `0 0 ${Viewport.CANVAS_WIDTH} ${Viewport.CANVAS_HEIGHT}`);

  const birdImg   = document.querySelector("#bird")   as SVGImageElement;
  const pipesGrp  = document.querySelector("#pipes")  as SVGGElement;
  const ghostsGrp = document.querySelector("#ghosts") as SVGGElement;
  const gameOver  = document.querySelector("#gameOver")  as SVGElement;
  const livesText = document.querySelector("#livesText") as HTMLElement;
  const scoreText = document.querySelector("#scoreText") as HTMLElement;

  const pipeNodes = new Map<string, { top: SVGRectElement; bot: SVGRectElement }>();
  const ghostNodes: SVGImageElement[] = [];

  const show = (el: SVGElement) => el.setAttribute("visibility", "visible");
  const hide = (el: SVGElement) => el.setAttribute("visibility", "hidden");

  return (s: State) => {
    // HUD
    livesText.textContent = String(s.lives);
    scoreText.textContent = String(s.score);

    // Player bird
    birdImg.setAttribute("x", String(Math.round(Birb.X - Birb.WIDTH / 2)));
    birdImg.setAttribute("y", String(Math.round(s.y)));

    // Ghosts
    const runs = getGhostRuns();
    while (ghostNodes.length < runs.length) {
      const g = document.createElementNS(svg.namespaceURI, "image") as SVGImageElement;
      g.setAttribute("href", "assets/birb.png");
      g.setAttribute("width", `${Birb.WIDTH}`);
      g.setAttribute("height", `${Birb.HEIGHT}`);
      g.setAttribute("opacity", "0.35");
      g.setAttribute("pointer-events", "none");
      ghostsGrp.appendChild(g);
      ghostNodes.push(g);
    }
    runs.forEach((path, i) => {
      const y = interpY(path, s.t);
      const node = ghostNodes[i];
      if (y == null) node.setAttribute("visibility", "hidden");
      else {
        node.setAttribute("visibility", "visible");
        node.setAttribute("x", String(Math.round(Birb.X - Birb.WIDTH / 2)));
        node.setAttribute("y", String(Math.round(y)));
      }
    });

    // Pipes (create/update/prune)
    for (const id of [...pipeNodes.keys()]) {
      if (!s.pipes.some(p => p.id === id && p.alive)) {
        const nodes = pipeNodes.get(id)!;
        nodes.top.remove(); nodes.bot.remove();
        pipeNodes.delete(id);
      }
    }
    for (const p of s.pipes) {
      if (!p.alive) continue;
      const gapTop = p.gapY - p.gapH / 2;
      const gapBot = p.gapY + p.gapH / 2;
      const x = pipeXAt(s.t, p.t0);

      let nodes = pipeNodes.get(p.id);
      if (!nodes) {
        const top = document.createElementNS(svg.namespaceURI, "rect") as SVGRectElement;
        top.setAttribute("fill", "green");
        top.setAttribute("width", `${Pipes.WIDTH}`);
        const bot = document.createElementNS(svg.namespaceURI, "rect") as SVGRectElement;
        bot.setAttribute("fill", "green");
        bot.setAttribute("width", `${Pipes.WIDTH}`);
        pipesGrp.appendChild(top);
        pipesGrp.appendChild(bot);
        nodes = { top, bot };
        pipeNodes.set(p.id, nodes);
      }
      nodes.top.setAttribute("x", String(Math.round(x)));
      nodes.top.setAttribute("y", `0`);
      nodes.top.setAttribute("height", `${Math.max(0, gapTop)}`);

      nodes.bot.setAttribute("x", String(Math.round(x)));
      nodes.bot.setAttribute("y", `${gapBot}`);
      nodes.bot.setAttribute("height", `${Math.max(0, Viewport.CANVAS_HEIGHT - gapBot)}`);
    }

    s.gameEnd ? show(gameOver) : hide(gameOver);
  };
};
