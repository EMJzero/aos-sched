import { Logger } from "winston";
import _ from "lodash";
import { Plan, Schedule, Options, TaskSlot } from "./types";

let latexArtifact = (
  code: string,
  name: string,
  clss: string,
  engine: string,
  addoptions: string
) => {
  let sfx = _.kebabCase(name);
  if (_.isUndefined(clss)) clss = "standalone";
  if (_.isUndefined(engine)) engine = "pdflatex";

  return {
    code,
    clss,
    name,
    sfx,
    engine,
    addoptions,
  };
};

let wrapper = (c: string) => `
\\begin{tikzpicture}
${c}
\\end{tikzpicture}
`;

let schedToLatex = (sched: Schedule, options: Options, logger: Logger) => {
  let hs = sched.plan.graphics.hspace;
  let vs = sched.plan.graphics.vspace;
  let hh = sched.plan.graphics.barheight;

  let printAt = (time: number, index: number, m: string) => {
    return `\\node at(${hs * time}, ${index * hs + 0.5 * hh}) {\\tiny ${m}};`;
  };

  let printAtConf = (time: number, index: number, m: string, conf: string) => {
    return `\\node [${conf}] at(${hs * time}, ${
      index * hs + 0.5 * hh
    }) {\\tiny ${m}};`;
  };

  let pAboveSlot = (r: TaskSlot) =>
    !_.isUndefined(r.aboveSlot) && r.aboveSlot.message !== ""
      ? printAtConf(
          r.tend,
          r.index + 0.4,
          `${r.aboveSlot.message}`,
          `anchor=east, text=${r.aboveSlot.color}`
        )
      : "";

  let drawRan = (r: TaskSlot) => {
    return [
      `\\draw[draw=black] (${r.tstart * hs}, ${r.index * vs}) rectangle ++(${
        (r.tend - r.tstart) * hs
      },${hh}) node[pos=.5] {}; `,
      printAt(r.tend, r.index - 0.4, r.belowSlot),
      printAt(r.tend - 0.25, r.index, `${r.inSlot}`),
      pAboveSlot(r),
    ];
  };
  let drawBlocked = (r: TaskSlot) => {
    return [
      `\\draw[draw=black, fill=gray] (${r.tstart * hs}, ${
        r.index * vs
      }) rectangle ++(${
        (r.tend - r.tstart) * hs
      },${hh}) node[pos=.5, text=white] {};`,
      pAboveSlot(r),
    ];
  };
  let drawRunnable = (r: TaskSlot) => {
    return [pAboveSlot(r)];
  };
  let diag = _.map(sched.timeline, (x) => {
    if (x.tstart < sched.plan.runfor) {
      if (x.event === "RAN") return drawRan(x);
      if (x.event === "BLOCKED") return drawBlocked(x);
      if (x.event === "RUNNABLE") return drawRunnable(x);
    }
    return [];
  });
  logger.debug(sched.plan.tasks);
  let tnames = _.flattenDeep([
    _.map(
      sched.plan.tasks,
      (t) => `\\node at(${hs * -1}, ${t.index * hs + 0.5 * hh}) {${t.name}};`
    ),
    _.map(sched.plan.tasks, (t) => [
      printAt(-0.6, t.index - 0.4, t.description[0]),
      printAt(-0.6, t.index - 0.2, t.description[1]),
    ]),
  ]);
  let grid = [
    `\\draw[xstep=${sched.plan.timer},gray!20,thin,shift={(0,-0.25)}] (0,0) grid (${sched.plan.runfor},${sched.plan.tasks.length});`,
    _.map(_.range(0, sched.plan.runfor / sched.plan.timer + 1), (i) =>
      printAtConf(
        i * sched.plan.timer,
        -0.7,
        `\\emph{${i * sched.plan.timer}}`,
        "text=gray"
      )
    ),
  ];
  logger.debug(sched.plan.tasks);

  let taskevents = _.map(sched.plan.tasks, (t) => {
    return [
      `\\draw [->] (${t.arrival}, ${t.index} + 0.75) -- (${t.arrival}, ${t.index});`,
    ];
  });

  let taskexits = _.map(sched.plan.tasks, (t) => {
    return !_.isUndefined(t.exited)
      ? [
          `\\draw [<-] (${t.exited}, ${t.index} + 0.75) -- (${t.exited}, ${t.index});`,
        ]
      : [];
  });

  let data = [
    printAtConf(
      -0.6,
      sched.plan.tasks.length,
      sched.scheddata.legendAbove,
      "anchor=west"
    ),
  ];
  if (_.isUndefined(options.blank) || !options.blank) {
    return wrapper(
      _.join(
        _.flattenDeep([grid, tnames, diag, taskevents, taskexits, data]),
        "\n"
      )
    );
  } else {
    return wrapper(
      _.join(_.flattenDeep([grid, tnames, taskevents, data]), "\n")
    );
  }
};

let exportLatex = (sim: Schedule, logger: Logger) => {
  return {
    complete: latexArtifact(
      schedToLatex(sim, { blank: false }, logger),
      "rt diagram",
      "standalone",
      "pdflatex",
      "-r varwidth"
    ),
    blank: latexArtifact(
      schedToLatex(sim, { blank: true }, logger),
      "rt diagram blank",
      "standalone",
      "pdflatex",
      "-r varwidth"
    ),
    data: latexArtifact(
      sim.scheddata.blankData,
      "data table",
      "standalone",
      "pdflatex",
      "-r varwidth"
    ),
  };
};

export { exportLatex };
