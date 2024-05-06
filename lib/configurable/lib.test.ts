import _ from "lodash";
import { eventLoop, schedClassFromString } from "./lib";
import { allPlans } from "./fixtures";
import { expect, it } from "@jest/globals";
import { Plan } from "../types";

const logger = {
  debug: () => {},
};

let mappedScheds = _.flatMap(allPlans, (s, i) => {
    const scheds = ["fifo", "hrrn", "sjf", "srtf", "rr"];
    let outscheds: Plan<any, any>[] = []
    _.forEach(scheds, (str, j) => {
      s["class"] = schedClassFromString(str);
      s["idx"] = i;
      outscheds.push(_.cloneDeep(s as Plan<any, any>));
    })
    return outscheds;
})

_.map(mappedScheds, (s, i) => {
  it(`Schedule ${s["idx"]} with scheduler \"${s.class.type}\"`, () => {
    const res = eventLoop({}, s, logger);
    expect(res.rawSimData).toMatchSnapshot();
  });
});
