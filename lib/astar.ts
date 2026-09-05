import { searchParams_utils } from "login/SearchParamsUtils";

export namespace astar {

    export function getUseAstarOpt() {
        return true;
    }

    export let isJumpBlockCheck = false;
    export function setJumpBlockCheck(value: boolean) {
        isJumpBlockCheck = value;
    }

    export let isJumpDynamicBlockCheck = false;
    export function setJumpDynamicBlockCheck(value: boolean) {
        isJumpDynamicBlockCheck = value;
    }

    enum WalkabilityEnum {
        Walkable = 0,
        Unwalkable = 1
    }

    export class Node extends PF.Node {

        value?: WalkabilityEnum = 0;

        constructor(x: number, y: number, walkable: boolean = true) {
            super(x, y, walkable);
        }
    }


    export class Grid extends PF.Grid {

        // =======mike override
        // focus pathfinding.d.ts -> class Grid 中声明的方法，需要override
        /**
         * override
         * @param width_or_matrix 
         * @param height 
         * @param mapDatas 
         */
        constructor(width_or_matrix: any, height?: number, mapDatas?: Uint8Array) {
            super(width_or_matrix, height);

            this.mapDatas = mapDatas;
        }

        /**
         * override
         * @param width 
         * @param height 
         * @param matrix 
         * @returns 
         */
        _buildNodes(width: number, height: number, matrix: any): Array<any> {
            if (astar.getUseAstarOpt()) {
                return [];
            }

            return super._buildNodes(width, height, matrix);
        }

        /**
         * override
         * @param node 
         * @param diagonalMovement 
         * @returns 
         */
        getNeighbors(node: Node, diagonalMovement: number): Array<any> {
            if (astar.getUseAstarOpt()) {
                var x = node.x,
                    y = node.y,
                    neighbors = [],
                    s0 = false, d0 = false,
                    s1 = false, d1 = false,
                    s2 = false, d2 = false,
                    s3 = false, d3 = false,
                    nodes = this.nodes;

                // ↑
                if (this.isWalkableAt(x, y - 1)) {
                    neighbors.push(this.getNode(x, y - 1));
                    s0 = true;
                }
                // →
                if (this.isWalkableAt(x + 1, y)) {
                    neighbors.push(this.getNode(x + 1, y));
                    s1 = true;
                }
                // ↓
                if (this.isWalkableAt(x, y + 1)) {
                    neighbors.push(this.getNode(x, y + 1));
                    s2 = true;
                }
                // ←
                if (this.isWalkableAt(x - 1, y)) {
                    neighbors.push(this.getNode(x - 1, y));
                    s3 = true;
                }
                if (diagonalMovement === PF.DiagonalMovement.Never) {
                    return neighbors;
                }

                if (diagonalMovement === PF.DiagonalMovement.OnlyWhenNoObstacles) {
                    d0 = s3 && s0;
                    d1 = s0 && s1;
                    d2 = s1 && s2;
                    d3 = s2 && s3;
                } else if (diagonalMovement === PF.DiagonalMovement.IfAtMostOneObstacle) {
                    d0 = s3 || s0;
                    d1 = s0 || s1;
                    d2 = s1 || s2;
                    d3 = s2 || s3;
                } else if (diagonalMovement === PF.DiagonalMovement.Always) {
                    d0 = true;
                    d1 = true;
                    d2 = true;
                    d3 = true;
                } else {
                    throw new Error('Incorrect value of diagonalMovement');
                }

                // ↖
                if (d0 && this.isWalkableAt(x - 1, y - 1)) {
                    neighbors.push(this.getNode(x - 1, y - 1));
                }
                // ↗
                if (d1 && this.isWalkableAt(x + 1, y - 1)) {
                    neighbors.push(this.getNode(x + 1, y - 1));
                }
                // ↘
                if (d2 && this.isWalkableAt(x + 1, y + 1)) {
                    neighbors.push(this.getNode(x + 1, y + 1));
                }
                // ↙
                if (d3 && this.isWalkableAt(x - 1, y + 1)) {
                    neighbors.push(this.getNode(x - 1, y + 1));
                }

                return neighbors;
            }

            return super.getNeighbors(node, diagonalMovement);
        }

        /**
         * override
         * @returns 
         */
        clone(): Grid {
            var i, j,

                width = this.width,
                height = this.height,
                thisNodes = this.nodes,

                newGrid = new Grid(width, height),
                newNodes = new Array(height);

            if (astar.getUseAstarOpt()) {
                // pass
            } else {
                for (i = 0; i < height; ++i) {
                    newNodes[i] = new Array(width);
                    for (j = 0; j < width; ++j) {
                        newNodes[i][j] = new Node(j, i, thisNodes[i][j].walkable);
                    }
                }
                newGrid.nodes = newNodes;
            }

            newGrid.watchNodes = [];

            newGrid.mapDatas = this.mapDatas;

            return newGrid;
        }

        /**
         * override
         * @param x 
         * @param y 
         * @returns 
         */
        isWalkableAt(x: number, y: number): boolean {
            if (LoginValue.InnerTest && searchParams_utils.sceneRoaming()) {
                if (this.isInside(x, y)) {
                    return true;
                }
            }

            if (astar.isJumpBlockCheck && this.isInside(x, y)) {
                return true;
            }

            return this.isWalkableValue(x, y);
        }

        isWalkableValue(x: number, y: number): boolean {
            if (astar.getUseAstarOpt()) {
                return this.isWalkableAt2(x, y);;
            } else {
                return super.isWalkableAt(x, y);
            }
        }

        /**
         * override
         * @param x 
         * @param y 
         * @param flag 
         */
        setWalkableAt(x: number, y: number, flag: boolean) {
            if (astar.getUseAstarOpt()) {
                this.setNodeValueAt(x, y, flag ? WalkabilityEnum.Walkable : WalkabilityEnum.Unwalkable);
            } else {
                super.setWalkableAt(x, y, flag);
            }
        }


        // =======mike add
        private watchNodes: Node[] = [];

        public pushWatchNode(_node: Node) {
            this.watchNodes.push(_node);
        }

        public reset(): void {
            //opt：只重置之前观察的格子
            let len = this.watchNodes.length;
            for (var index = 0; index < len; index++) {
                var node: Node = this.watchNodes[index];
                this.resetNode(node);
            }
            this.watchNodes = [];
        }

        private resetNode(_node: Node) {
            _node.g = 0;
            _node.f = 0;
            _node.h = 0;
            _node.by = 0;
            // _node.value = 0;
            _node.parent = null;
            _node.opened = false;
            _node.closed = false;
            _node.tested = false;
        }

        private recordedNodeMap = new Map<number, WalkabilityEnum>();
        private nodeMap: { [y: number]: { [x: number]: Node } } = {};

        /**动态阻挡*/
        private dynamicBlockMap = new Map<number, boolean>();
        private computeKey(x: number, y: number): number {
            let key = y * this.width + x;
            return key;
        }

        public addDynamicBlock(x: number, y: number) {
            const key = this.computeKey(x, y);
            this.dynamicBlockMap.set(key, true);
        }
        public removeDynamicBlock(x: number, y: number) {
            const key = this.computeKey(x, y);
            this.dynamicBlockMap.delete(key);
        }
        public clearDynamicBlock() {
            this.dynamicBlockMap = new Map<number, boolean>();
        }
        public getIsDynamicBlock(x: number, y: number) {
            if (astar.isJumpDynamicBlockCheck) {
                return false;
            }
            const key = this.computeKey(x, y);
            return this.dynamicBlockMap.get(key) ?? false;
        }

        private m_objMapDatas: Uint8Array;
        public set mapDatas(value: Uint8Array) {
            this.m_objMapDatas = value;
        }
        public get mapDatas(): Uint8Array {
            return this.m_objMapDatas;
        }
        private isWalkableAt2(x: number, y: number): boolean {
            if (!this.isInside(x, y)) return false;

            if (this.getIsDynamicBlock(x, y)) {
                return false;
            }

            return this.getNodeValueAt(x, y) ? false : true;
        }

        /**
         * 创建Node
         * @param	x
         * @param	y
         * @return
         */
        private createNode(x: number, y: number): Node {
            let _node = new Node(x, y);

            return _node;
        }

        public getNode(x: number, y: number): Node {
            if (!astar.getUseAstarOpt()) {
                return this.getNodeAt(x, y);
            }

            if (!this.nodeMap[y]) {
                this.nodeMap[y] = {};
            }

            let node = this.nodeMap[y][x];
            if (!node) {
                node = this.createNode(x, y);
                node.value = this.getNodeValueAt(x, y);

                this.nodeMap[y][x] = node;
            }

            return node;
        }

        private getNodeValueAt(x: number, y: number): WalkabilityEnum {
            let key = this.computeKey(x, y); // y + "_" + x;
            let _value: WalkabilityEnum;
            if (this.recordedNodeMap.has(key)) {
                _value = this.recordedNodeMap.get(key);
            }
            else {
                let index = y * this.width + x;
                let i = Math.floor(index / 8);
                let bit = 7 - index % 8;
                _value = (this.mapDatas[i] & (0x01 << bit)); // 0：可以走，1：不可走
            }

            return _value;
        }

        private setNodeValueAt(x: number, y: number, value: WalkabilityEnum) {
            let key = this.computeKey(x, y);
            this.recordedNodeMap.set(key, value);
        }

        public smoothenPathWithConnerTest(path) {
            var len = path.length,
                x0 = path[0][0],        // path start x
                y0 = path[0][1],        // path start y
                x1 = path[len - 1][0],  // path end x
                y1 = path[len - 1][1],  // path end y
                sx, sy,                 // current start coordinate
                ex, ey,                 // current end coordinate
                newPath,
                i, j, coord, line, testCoord, blocked;

            sx = x0;
            sy = y0;
            newPath = [[sx, sy]];

            for (i = 2; i < len; ++i) {
                coord = path[i];
                ex = coord[0];
                ey = coord[1];
                line = PF.Util.interpolate(sx, sy, ex, ey);

                blocked = false;
                for (j = 1; j < line.length; ++j) {
                    testCoord = line[j];

                    if (!this.isWalkableAt(testCoord[0], testCoord[1])) {
                        blocked = true;
                        break;
                    }
                    let xb = line[j - 1][0];
                    let yb = line[j - 1][1];
                    if (Math.abs(xb - testCoord[0]) + Math.abs(yb - testCoord[1]) > 0) {
                        // 斜对角
                        if (!this.isWalkableAt(testCoord[0], yb) || !this.isWalkableAt(xb, testCoord[1])) {
                            blocked = true;
                            break;
                        }
                    }
                }
                if (blocked) {
                    var lastValidCoord = path[i - 1];
                    newPath.push(lastValidCoord);
                    sx = lastValidCoord[0];
                    sy = lastValidCoord[1];
                }
            }
            newPath.push([x1, y1]);

            return newPath;
        }

        clear() {
            this.recordedNodeMap = new Map<number, WalkabilityEnum>();
            this.nodeMap = [];

            this.clearDynamicBlock();

            this.mapDatas = null;
        }
    }


    export class AStarFinder extends PF.AStarFinder {

        constructor(opt: any) {
            super(opt);
        }

        /**统一走findPathOpt */
        public findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): any[] {
            return this.findPathOpt(startX, startY, endX, endY, grid);
        }

        /**优化版 */
        public findPathOpt(startX: number, startY: number, endX: number, endY: number, grid: Grid): any[] {
            // console.log(`do findPath: start_frame = ${egret.sys.FRAME_START_TIME}`);

            // return this.findPath(startX, startY, endX, endY, grid);

            var openList = new PF.Heap(function (nodeA: Node, nodeB: Node) {
                return nodeA.f - nodeB.f;
            }),
                startNode = grid.getNode(startX, startY),
                endNode = grid.getNode(endX, endY),
                heuristic = this.heuristic,
                diagonalMovement = this.diagonalMovement,
                weight = this.weight,
                abs = Math.abs, SQRT2 = Math.SQRT2,
                node: Node, neighbors: Node[], neighbor: Node, i, l, x, y, ng;

            // set the `g` and `f` value of the start node to be 0
            startNode.g = 0;
            startNode.f = 0;

            // push the start node into the open list
            openList.push(startNode);
            startNode.opened = true;

            // while the open list is not empty
            while (!openList.empty()) {
                // pop the position of node which has the minimum `f` value.
                node = openList.pop();
                node.closed = true;

                grid.pushWatchNode(node);

                // if reached the end position, construct the path and return it
                if (node === endNode) {
                    return PF.Util.backtrace(endNode);
                }

                // get neigbours of the current node
                neighbors = grid.getNeighbors(node, diagonalMovement);
                for (i = 0, l = neighbors.length; i < l; ++i) {
                    neighbor = neighbors[i];

                    grid.pushWatchNode(neighbor);

                    if (neighbor.closed) {
                        continue;
                    }

                    x = neighbor.x;
                    y = neighbor.y;

                    // get the distance between current node and the neighbor
                    // and calculate the next g score
                    ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);

                    // check if the neighbor has not been inspected yet, or
                    // can be reached with smaller cost from the current node
                    if (!neighbor.opened || ng < neighbor.g) {
                        neighbor.g = ng;
                        neighbor.h = neighbor.h || weight * heuristic(abs(x - endX), abs(y - endY));
                        neighbor.f = neighbor.g + neighbor.h;
                        neighbor.parent = node;

                        if (!neighbor.opened) {
                            openList.push(neighbor);
                            neighbor.opened = true;
                        } else {
                            // the neighbor can be reached with smaller cost.
                            // Since its f value has been updated, we have to
                            // update its position in the open list
                            openList.updateItem(neighbor);
                        }
                    }
                } // end for each neighbor
            } // end while not open list empty

            // fail to find the path
            return [];
        }
    }

}