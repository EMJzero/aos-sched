#!/usr/bin/env bun

import { program } from "@caporal/core";

import { exportLatex, exportLatexSummary } from "./lib/artifacts";
import { Schedule, Plan, ScheduleProducer } from "./lib/types";
import { FIFOSchedClass, SJFSchedClass, SRTFSchedClass, HRRNSchedClass, RRSchedClass } from "./lib/configurable/lib";

type Tests = {
  cfs: Plan<any, any>[];
  fifo: Plan<any, any>[];
  sjf: Plan<any, any>[];
  srtf: Plan<any, any>[];
  hrrn: Plan<any, any>[];
  rr: Plan<any, any>[];
};

type Simulators = {
  cfs: ScheduleProducer;
  fifo: ScheduleProducer;
  sjf: ScheduleProducer;
  srtf: ScheduleProducer;
  hrrn: ScheduleProducer;
  rr: ScheduleProducer;
};

let tests: Tests = {
  cfs: require("./lib/cfs/fixtures").plans as Plan<any, any>[],
  fifo: require("./lib/configurable/fixtures").plansFIFO as Plan<any, any>[],
  sjf: require("./lib/configurable/fixtures").plansSJF as Plan<any, any>[],
  srtf: require("./lib/configurable/fixtures").plansSRTF as Plan<any, any>[],
  hrrn: require("./lib/configurable/fixtures").plansHRRN as Plan<any, any>[],
  rr: require("./lib/configurable/fixtures").plansRR as Plan<any, any>[],
};

let sims: Simulators = {
  cfs: require("./lib/cfs/lib").produceSchedule as ScheduleProducer,
  fifo: require("./lib/configurable/lib").produceSchedule as ScheduleProducer,
  sjf: require("./lib/configurable/lib").produceSchedule as ScheduleProducer,
  srtf: require("./lib/configurable/lib").produceSchedule as ScheduleProducer,
  hrrn: require("./lib/configurable/lib").produceSchedule as ScheduleProducer,
  rr: require("./lib/configurable/lib").produceSchedule as ScheduleProducer,
};

let $fs = require("mz/fs");
let $gstd = require("get-stdin");

let main = () => {
  program
    .name("aos-sched")
    .description("Create temporal diagrams of AOS realtime schedulers")
    .command("dump", "Dump out examples")
    .argument("<sched>", "Scheduler to use", {
      validator: ["cfs", "fifo", "sjf", "srtf", "hrrn", "rr"],
    })
    .argument("<num>", "Example number", {
      validator: program.NUMBER,
    })
    .action(({ args }) => {
      let n: number = parseInt(args.num + "");
      console.log(JSON.stringify(tests[args.sched + ""][n]));
    })
    .command("simulate", "Simulate provided schedule")
    .argument("<sched>", "Scheduler to use", {
      validator: ["cfs", "fifo", "sjf", "srtf", "hrrn", "rr"],
    })
    .argument("[json]", "JSON file or stdin")
    .action(({ logger, args, options }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((sched: Plan<any, any>) => {
        let sim: Schedule;
        switch (args.sched) {
          case "cfs":
            sim = sims.cfs(options, sched, logger);
            break;
          case "fifo":
            // WARNING: this is a workaround since you cannot dump the whole SchedClass with lambdas...
            sched.class = FIFOSchedClass;
            sim = sims.fifo(options, sched, logger);
            break;
          case "sjf":
            // WARNING: this is a workaround since you cannot dump the whole SchedClass with lambdas...
            sched.class = SJFSchedClass;
            sim = sims.sjf(options, sched, logger);
            break;
          case "srtf":
            // WARNING: this is a workaround since you cannot dump the whole SchedClass with lambdas...
            sched.class = SRTFSchedClass;
            sim = sims.srtf(options, sched, logger);
            break;
          case "hrrn":
            // WARNING: this is a workaround since you cannot dump the whole SchedClass with lambdas...
            sched.class = HRRNSchedClass;
            sim = sims.hrrn(options, sched, logger);
            break;
          case "rr":
            // WARNING: this is a workaround since you cannot dump the whole SchedClass with lambdas...
            sched.class = RRSchedClass;
            sim = sims.rr(options, sched, logger);
            break;
          default:
            console.log("ERROR: invalid <sched> argument passed the validator check!");
            return;
        }
        console.log(JSON.stringify(sim, null, 2));
      });
    })
    .command("export", "Export simulation data to available formats")
    .argument("<artifact>", "Artifact name")
    .argument("[json]", "JSON file or stdin")
    .action(({ logger, args }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((sim: Schedule) => {
        console.log(exportLatex(sim, logger)[args.artifact + ""].code);
      });
    })
    .command("table", "Export a LaTeX table with the summary of tasks")
    .argument("<artifact>", "Artfiact name")
    .argument("[JSON]", "JSON file or stdin")
    .action(({ logger, args }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((sim: Schedule) => {
        console.log(exportLatexSummary(sim, logger)[args.artifact + ""].code);
      });
    });
    
  program.run();
};

main();

#!/usr/bin/env bun

import { program } from "@caporal/core";

import { exportLatex } from "./lib/artifacts";
import { Schedule, Plan, ScheduleProducer } from "./lib/types";

type Tests = {
  cfs: Plan<any, any>[];
};

type Simulators = {
  cfs: ScheduleProducer;
};

let tests: Tests = {
  cfs: require("./lib/cfs/fixtures").plans as Plan<any, any>[],
};

let sims: Simulators = {
  cfs: require("./lib/cfs/lib").produceSchedule as ScheduleProducer,
};

let $fs = require("mz/fs");
let $gstd = require("get-stdin");

let main = () => {
  program
    .name("aos-sched")
    .description("Create temporal diagrams of AOS realtime schedulers")
    .command("dump", "Dump out examples")
    .argument("<sched>", "Scheduler to use", {
      validator: ["cfs"],
    })
    .argument("<num>", "Example number", {
      validator: program.NUMBER,
    })
    .action(({ args }) => {
      let n: number = parseInt(args.num + "");
      console.log(JSON.stringify(tests[args.sched + ""][n]));
    })
    .command("simulate", "Simulate provided schedule")
    .argument("<sched>", "Scheduler to use", {
      validator: ["cfs"],
    })
    .argument("[json]", "JSON file or stdin")
    .action(({ logger, args, options }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((sched: Plan<any, any>) => {
        let sim: Schedule;
        if (args.sched === "cfs") {
          sim = sims.cfs(options, sched, logger);
          console.log(JSON.stringify(sim, null, 2));
        }
      });
    })
    .command("export", "Export simulation data to available formats")
    .argument("<artifact>", "Artifact name")
    .argument("[json]", "JSON file or stdin")
    .action(({ logger, args }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((sim: Schedule) => {
        console.log(exportLatex(sim, logger)[args.artifact + ""].code);
      });
    });
  program.run();
};

main();
