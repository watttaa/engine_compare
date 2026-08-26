import "./sim/stats";
import "./sim/bunny-sim";
import "./sim/boids-sim";
import "./sim/bench-runner";
import { LayaBench } from "./LayaBench";

const { regClass, property } = Laya;

@regClass()
export class Main extends Laya.Script {

    onStart() {
        console.log("Game start");
        LayaBench.start();
    }
}
