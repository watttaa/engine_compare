import "./sim/stats";
import "./sim/bench-runner";
import "./sim/mc-compare";
import "./sim/pathfinding";
import "./sim/mc-sim";
import { LayaBench_MC } from "./LayaBench_MC";

const { regClass, property } = Laya;

@regClass()
export class Main extends Laya.Script {

    onStart() {
        console.log("Game start");
        LayaBench_MC.start();
    }
}
