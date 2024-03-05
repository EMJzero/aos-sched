#!/usr/bin/env bun

import { program } from "@caporal/core";

import { exportLatex, exportLatexSummary } from "./lib/artifacts";
import { Schedule, Plan, GenericPlan, ScheduleProducer } from "./lib/types";
import { FIFOSchedClass, RRSchedClass, SJFSchedClass, SRTFSchedClass, HRRNSchedClass, schedClassFromString } from "./lib/configurable/lib";
import { string } from "easy-table";

type Tests = {
  cfs: Plan<any, any>[];
  configurable: GenericPlan<any>[];
};

type Simulators = {
  cfs: ScheduleProducer;
  configurable: ScheduleProducer;
};

let tests: Tests = {
  cfs: require("./lib/cfs/fixtures").plans as Plan<any, any>[],
  configurable: require("./lib/configurable/fixtures").allPlans as GenericPlan<any>[],
};

let sims: Simulators = {
  cfs: require("./lib/cfs/lib").produceSchedule as ScheduleProducer,
  configurable: require("./lib/configurable/lib").produceSchedule as ScheduleProducer,
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
      if (args.sched === "cfs") {
        console.log(JSON.stringify(tests.cfs[n]));
      } else {
        //Inject the scheduler string, then return the JSON
        let plan = tests.configurable[n];
        plan.class["type"] = args.sched;
        console.log(JSON.stringify(plan));
      }
    })
    .command("simulate", "Simulate provided schedule")
    /*.argument("<sched>", "Scheduler to use", {
      validator: ["cfs", "fifo", "sjf", "srtf", "rr"],
    })*/
    .argument("[json]", "JSON file or stdin")
    .action(({ logger, args, options }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((presched: any) => {
        //Inject the class into the object
        let class_customizable = presched.class["type"];
        if (class_customizable !== "cfs") {
          presched.class = schedClassFromString(presched.class["type"])
        }
        return presched as Plan<any, any>;
      }).then((sched: Plan<any, any>) => {
        let sim: Schedule;
        if (sched.class.type !== "cfs") {
          sim = sims.configurable(options, sched, logger);
        } else {
          sim = sims.cfs(options, sched, logger);
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
