import { Logger } from "winston";
import _ from "lodash";
import { Plan, Schedule, Options, TaskSlot } from "./types";
import { SimPlan } from "./configurable/lib";

class TaskSummaryData {
  arrival: number;
  computation: number;
  start: number | undefined;
  completion: number | undefined;
  waiting: number | undefined;
  turnaround: number | undefined;

  constructor(arrival: number, computation: number, waiting: number | undefined, completion: number | undefined, start: number | undefined, turnaround: number | undefined) {
    this.arrival = arrival;
    this.computation = computation;
    this.waiting = waiting;
    this.completion = completion;
    this.start = start;
    this.turnaround = turnaround;
  }
}

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

let schedToLatexSummary = (sched: Schedule, options: Options, logger: Logger) => {
  //Get the data for each task
  let taskData: TaskSummaryData[] = [];
  if (sched.plan === undefined) {
    // We are extracting a table WITHOUT running a simulation, so we can only have a blank table
    let slots = sched.timeline;
    let plan = ((sched as unknown) as SimPlan)
    for (let index = 0; index < plan.tasks.length; index++) {
      const task = plan.tasks[index];
      taskData.push(new TaskSummaryData(task.arrival, task.events[task.events.length - 1], undefined, undefined, undefined, undefined))
    }
  } else {
    // We are extracting a table AFTER a simulation has completed, so we can have both a blank and filled-out (as best as the simulation allows) table
    let slots = sched.timeline;
    for (let index = 0; index < sched.plan.tasks.length; index++) {
      const task = sched.plan.tasks[index];
      //Find the start & end times
      let myslots = slots.filter((v, i, a) => v.index == task.index);
      let start = myslots.find((v, i, o) => v.event === "RAN")?.tstart;
      let end = myslots.find((v, i, o) => v.event === "EXITED")?.tend;
      //Find the waiting time
      let waiting = start !== undefined ? start - task.arrival : undefined;
      //Find the turnaround
      let turnaround = end !== undefined ? end - task.arrival : undefined;
      if (options.blank) {
        start = undefined;
        end = undefined;
        waiting = undefined;
        turnaround = undefined;
      }
      taskData.push(new TaskSummaryData(task.arrival, task["computation"], waiting, end, start, turnaround))
    }
  }

  let begin = `\\begin{table}[]
  \\centering
  \\caption{Summary of Tasks}
  \\vspace{10pt}
  \\begin{tabular}{c|c|c|c|c|c|c}
  Task & Arrival & Computation & Start & Finish & Waiting (W) & Turnaround (Z) \\\\
  \\hline`
  for (let index = 0; index < taskData.length; index++) {
    const task = taskData[index];
    begin += `\n${index} & ${task.arrival} & ${task.computation} & ${task.start ?? ""} & ${task.completion ?? ""} & ${task.waiting ?? ""} & ${task.turnaround ?? ""} \\\\`;
  }
  begin += `\n\\end{tabular}
  \\label{tab:my_label}
\\end{table}`;
  return begin;
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

let exportLatexSummary = (sim: Schedule, logger: Logger) => {
  return {
    complete: latexArtifact(
      schedToLatexSummary(sim, { blank: false }, logger),
      "rt diagram",
      "standalone",
      "pdflatex",
      "-r varwidth"
    ),
    blank: latexArtifact(
      schedToLatexSummary(sim, { blank: true }, logger),
      "rt diagram blank",
      "standalone",
      "pdflatex",
      "-r varwidth"
    )
  };
};

export { exportLatex, exportLatexSummary };
