import { Logger } from "winston";
import _ from "lodash";
import { Plan, Schedule, Options, TaskSlot } from "./types";
import { SimPlan } from "./configurable/lib";

class TaskSummaryData {
  arrival: number;
  computation: number;
  //wakeups: number[];
  //sleeps: number[];
  start?: number;
  completion?: number;
  waiting?: number;
  turnaround?: number;
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

  let text: Array<{ text: String, color: String }> = [];

  let printAt = (time: number, index: number, m: string) => {
    return `\\node at(${hs * time}, ${index * hs + 0.5 * hh}) {\\tiny ${m}};`;
  };

  let printAtConf = (time: number, index: number, m: string, conf: string) => {
    return `\\node [${conf}] at(${hs * time}, ${
      index * hs + 0.5 * hh
    }) {\\tiny ${m}};`;
  };

  let pAboveSlot = (r: TaskSlot) => {
    if (!_.isUndefined(r.aboveSlot) && r.aboveSlot.message !== "") {
      if (options.inline) {
        return printAtConf(
          r.tend,
          r.index + 0.4,
          `${r.aboveSlot.message}`,
          `anchor=east, text=${r.aboveSlot.color}`
        );
      } else {
        text.push({
          text: `${r.aboveSlot.message}`,
          color: `${r.aboveSlot.color}`
        });
        return `\\node [shape=circle,draw, inner sep=1pt, ${r.aboveSlot.color}]
          at(${hs * r.tend - 0.3}, ${(r.index + 0.4) * hs + 0.5 * hh}) {\\tiny ${text.length}};`
      }
    } else {
      return "";
    }
  }

  let pVertMarker = (r: TaskSlot) =>
    !_.isUndefined(r.aboveSlot) && r.aboveSlot.message !== ""
      ? `\\draw[draw=${r.aboveSlot.color}] [|>-] (${r.tstart * hs}, ${r.index} + 0.55) -- (${r.tstart * hs}, ${r.index});`
      : "";

  let drawRan = (r: TaskSlot) => {
    return [
      `\\draw[draw=black] (${r.tstart * hs}, ${r.index * vs}) rectangle ++(${
        (r.tend - r.tstart) * hs
      },${hh}) node[pos=.5] {}; `,
      options.nobelow ? "" : printAt(r.tend, r.index - 0.4, r.belowSlot),
      printAt(r.tend - 0.25, r.index, `${r.inSlot}`),
      pAboveSlot(r),
      pVertMarker(r)
    ].filter((s : String) => s !== "");
  };
  let drawBlocked = (r: TaskSlot) => {
    return [
      `\\draw[draw=black, fill=gray] (${r.tstart * hs}, ${
        r.index * vs
      }) rectangle ++(${
        (r.tend - r.tstart) * hs
      },${hh}) node[pos=.5, text=white] {};`,
      pAboveSlot(r),
      pVertMarker(r)
    ].filter((s : String) => s !== "");
  };
  let drawRunnable = (r: TaskSlot) => {
    return [
      pAboveSlot(r),
      pVertMarker(r)
    ].filter((s : String) => s !== "");
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

  let aftertext = _.map(text, (t, i) => 
    `\\node [shape=circle, draw, inner sep=1pt, ${t.color}] (legendNode${i}) at(-1, ${-1.2 - 0.25*i}) {\\tiny ${i + 1}};
    \\node [right, text=${t.color}] at(legendNode${i}.east) {\\tiny ${t.text}};`
  );
  if (text.length > 0) {
    aftertext.push(
      `\\node [below] at(0, -0.75) {\\tiny Legend:};`
    );
  }

  if (_.isUndefined(options.blank) || !options.blank) {
    return wrapper(
      _.join(
        _.flattenDeep([grid, tnames, diag, taskevents, taskexits, data, aftertext]),
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
  // Get the data for each task
  let taskData: TaskSummaryData[] = [];
  if (sched.plan === undefined) {
    // We are extracting a table WITHOUT running a simulation, so we can only have a blank table
    let slots = sched.timeline;
    let plan = ((sched as unknown) as SimPlan)
    for (let index = 0; index < plan.tasks.length; index++) {
      const task = plan.tasks[index];
      /*let sleeps: number[] = [];
      let wakeups: number[] = [];
      let accumulator = 0;
      for (let i = 0; i < task.events.length; i++) {
        const event = task.events[i];
        if (i % 2 == 0) {
          sleeps.push(event + accumulator);
        } else {
          wakeups.push(event);
        }
        if (i == 0) {
          accumulator += event;
        }
      }*/
      taskData.push({
        arrival: task.arrival,
        computation: task.events[task.events.length - 1],
        //sleeps: sleeps,
        //wakeups: wakeups,
        waiting: undefined,
        completion: undefined,
        start: undefined,
        turnaround: undefined
      } as TaskSummaryData)
    }
  } else {
    // We are extracting a table AFTER a simulation has completed, so we can have both a blank and filled-out (as best as the simulation allows) table
    let slots = sched.timeline;
    for (let index = 0; index < sched.plan.tasks.length; index++) {
      const task = sched.plan.tasks[index];
      // Find the start & end times
      let myslots = slots.filter((v, i, a) => v.index == task.index);
      let start = myslots.find((v, i, o) => v.event === "RAN")?.tstart;
      let end = myslots.find((v, i, o) => v.event === "EXITED")?.tend;
      // Find the waiting time
      let waiting = start !== undefined ? start - task.arrival : undefined;
      // Find the turnaround
      let turnaround = end !== undefined ? end - task.arrival : undefined;
      if (options.blank) {
        start = undefined;
        end = undefined;
        waiting = undefined;
        turnaround = undefined;
      }
      /*let sleeps: number[] = [];
      let wakeups: number[] = [];
      let accumulator = 0;
      for (let i = 0; i < task.events.length; i++) {
        const event = task.events[i];
        if (i % 2 == 0) {
          sleeps.push(event + accumulator);
        } else {
          wakeups.push(event);
        }
        if (i == 0) {
          accumulator += event;
        }
      }*/
      taskData.push({
        arrival: task.arrival,
        computation: task["computation"] ?? task["vrt"],
        //sleeps: sleeps,
        //wakeups: wakeups,
        waiting: waiting,
        completion: end,
        start: start,
        turnaround: turnaround
      } as TaskSummaryData)
    }
  }

  let begin = `\\begin{table}[]
\\centering
\\caption{Summary of Tasks}
\\vspace{10pt}
\\begin{tabular}{c|c|c|c|c|c}
Task & Arrival & ${sched.plan.class.type === "cfs" ? "Final VRT" : "Computation"} & Start & Finish & Waiting (W) & Turnaround (Z) \\\\
\\hline`
for (let index = 0; index < taskData.length; index++) {
  const task = taskData[index];
  begin += `\n${index+1} & ${task.arrival} & ${task.computation} & ${task.start ?? ""} & ${task.completion ?? ""} & ${task.waiting ?? ""} & ${task.turnaround ?? ""} \\\\`;
}
begin += `\n\\end{tabular}
\\label{tab:my_label}
\\end{table}`;
//+ `\\textit{{\\tiny Note: the values in the \\textbf{Sleep} column indicate each running time at which the associated task goes to sleep, an event with time $t$ is to be interpreted as happening when the task has actually ran for $t$ units of time. Instead, values in the \\textbf{Wakeup} column indicate the time after which the task wakes up, counting from the moment it goes to sleep: with an event of value $w$, if the task goes to sleep at absolute time $\\tau$, it will wakeup at absolute time $\\tau + w$. Events are all naturally consumed left-to-right.}}`;
  return begin;
};

let exportLatex = (sim: Schedule, inline: Boolean, nobelow: Boolean, logger: Logger) => {
  return {
    complete: latexArtifact(
      schedToLatex(sim, { blank: false, inline: inline, nobelow: nobelow }, logger),
      "rt diagram",
      "standalone",
      "pdflatex",
      "-r varwidth"
    ),
    blank: latexArtifact(
      schedToLatex(sim, { blank: true, inline: inline, nobelow: nobelow }, logger),
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
      schedToLatexSummary(sim, { blank: false, inline: false, nobelow: false }, logger),
      "rt diagram",
      "standalone",
      "pdflatex",
      "-r varwidth"
    ),
    blank: latexArtifact(
      schedToLatexSummary(sim, { blank: true, inline: false, nobelow: false }, logger),
      "rt diagram blank",
      "standalone",
      "pdflatex",
      "-r varwidth"
    )
  };
};

export { exportLatex, exportLatexSummary };
