  /**
 * MCSim — 预烘焙骨骼动画场景仿真核心（引擎无关）
 *
 * 测试场景（真实多人场景）：
 *  M2 8 种职业混编 × N，body/head/weapon 三层帧动画，独立 A* 随机行走。
 *
 * 地图：
 *  - 加载 assets/map/1001/1001.map（Uint8Array 位图，bit=0 可走）
 *  - CELL_SIZE = 20px（与游戏一致）
 *  - 场景尺寸：cellW=80, cellH=69 → 1600×1380px
 *
 * A* 寻路（引擎无关，与游戏 astar.ts 同库 PF）：
 *  - 出生：随机可走格
 *  - 每人独立目标，走到终点切 idle，再随机寻路到新终点
 *  - MAX_PATHFIND_PER_FRAME=8 分帧限流（防单帧卡顿）
 *  - smoothenPath 平滑路径
 */
(function (global) {
  'use strict';

  var CELL_SIZE  = 20;
  var MAP_CELL_W = 54;   // ceil(1080 / 20)
  // 1001.map 为 634 bytes = 5072 位；游戏 MapGroup 按位图逐格建 Grid。
  // 54 列时真实有效行数为 floor(5072 / 54) = 93，最后不足一行的位一律阻挡。
  var MAP_CELL_H = 94;
  var MAP_W_PX   = MAP_CELL_W * CELL_SIZE;  // 1080
  var MAP_H_PX   = MAP_CELL_H * CELL_SIZE;  // 1880

  var CHARACTERS = ['1001','1002','1003','1004','1005','1006','1007','1008'];
  var ANIMS      = ['stand','walk'];

  // 每帧最多调 A* 的角色数（分帧限流）
  var MAX_PATHFIND_PER_FRAME = 2;  // 降低到 2，避免单帧 clone 爆开
  // A* 最远寻路格数（限距离减少搜索空间）
  var MAX_PATH_DIST = 20;
  // 游戏 SceneRandomWalkComponent：到达后等待 500ms + 0~1000ms 再发起下一次随机移动。
  var RANDOM_WALK_WAIT_MIN = 500;
  var RANDOM_WALK_WAIT_JITTER = 1000;

  // -------- 地图格数据 --------
  var _mapLoaded = false;
  var _mapBytes = null;   // Uint8Array
  var _pfGrid   = null;   // PF.Grid（每次 clone 使用）
  var _pfFinder = null;   // PF.AStarFinder
  // 地图就绪前已 spawn 的角色列表，就绪后统一校验位置
  var _pendingInstances = [];

  /** 初始化 PF 寻路器（只需调一次）*/
  function initPathfinder(mapBytes) {
    _mapBytes = mapBytes;
    var PF = global.PF;
    if (!PF) { console.warn('[MCSim] pathfinding.js 未加载，寻路降级为随机游走'); return; }

    // 构造 PF.Grid
    _pfGrid = new PF.Grid(MAP_CELL_W, MAP_CELL_H);
    for (var y = 0; y < MAP_CELL_H; y++) {
      for (var x = 0; x < MAP_CELL_W; x++) {
        var idx  = y * MAP_CELL_W + x;
        var byteI = Math.floor(idx / 8);
        var bit   = 7 - (idx % 8);
        var walkable = byteI < mapBytes.length
          ? !((mapBytes[byteI] & (0x01 << bit)))   // 0=可走，1=不可走
          : false;                                  // 游戏无位图数据的格子不可走
        _pfGrid.setWalkableAt(x, y, walkable);
      }
    }

    _pfFinder = new PF.AStarFinder({
      diagonalMovement: PF.DiagonalMovement.OnlyWhenNoObstacles
    });
    _mapLoaded = true;
    var bits = mapBytes.length * 8;
    var cells = MAP_CELL_W * MAP_CELL_H;
    console.log('[MCSim] A* 地图就绪: ' + MAP_CELL_W + 'x' + MAP_CELL_H + ' cells, data=' + bits + ' bits, expected=' + cells);
    if (bits < cells) console.info('[MCSim] 阻挡位图末尾缺少 ' + (cells - bits) + ' 格，已按游戏阻挡规则处理');

    // 地图就绪后，把所有已 spawn 但位置未经地图校验的角色重置到可走格
    if (_pendingInstances.length > 0) {
      for (var pi = 0; pi < _pendingInstances.length; pi++) {
        var f = _pendingInstances[pi];
        if (!_pfGrid.isWalkableAt(f.cx, f.cy)) {
          var safe = randomWalkable();
          f.cx = safe.x; f.cy = safe.y;
          f.x  = safe.x * CELL_SIZE;
          f.y  = safe.y * CELL_SIZE;
        }
      }
      _pendingInstances.length = 0;
    }
  }

  MCSim.initPathfinder = initPathfinder;
  MCSim.isMapLoaded    = function () { return _mapLoaded; };
  MCSim.MAP_W_PX       = MAP_W_PX;
  MCSim.MAP_H_PX       = MAP_H_PX;
  MCSim.CELL_SIZE      = CELL_SIZE;
  MCSim.CHARACTERS     = CHARACTERS;
  MCSim.ANIMS          = ANIMS;

  // -------- 找一个可走格 --------
  function randomWalkable() {
    if (!_mapLoaded) {
      return { x: Math.floor(Math.random() * MAP_CELL_W), y: Math.floor(Math.random() * MAP_CELL_H) };
    }
    var maxTry = 200;
    while (maxTry-- > 0) {
      var cx = Math.floor(Math.random() * MAP_CELL_W);
      var cy = Math.floor(Math.random() * MAP_CELL_H);
      if (_pfGrid.isWalkableAt(cx, cy)) return { x: cx, y: cy };
    }
    return { x: 5, y: 5 }; // fallback
  }

  // -------- 寻路（不用 clone，每次用 mapBytes 重建小范围 grid）--------
  function findPath(sx, sy, ex, ey) {
    if (!_mapLoaded || !_pfFinder) return null;
    var g = _pfGrid.clone();
    var path = _pfFinder.findPath(sx, sy, ex, ey, g);
    if (path && path.length > 1) path = PF.Util.smoothenPath(g, path);
    return (path && path.length > 0) ? path : null;
  }

  // -------- 方向计算（与游戏 preload_utils_math.calcDirection 完全一致）--------
  //   dx=e.x-s.x, dy=e.y-s.y, angle=atan2(dy,dx)*180/PI
  //   angle>0  → dy>0 向下：angle>90 ? DIR_1 : DIR_0
  //   angle<=0 → dy<0 向上：angle>-90 ? DIR_3 : DIR_2
  //   DIR_0 右下  DIR_1 左下  DIR_2 左上  DIR_3 右上
  function calcDirection(sx, sy, ex, ey) {
    var dx = ex - sx, dy = ey - sy;
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle > 0) return angle > 90 ? 1 : 0;
    return angle > -90 ? 3 : 2;
  }
  // 资源方向组：dir>1 → animate2(向上)，否则 animate0(向下)
  function resDirOf(dir)  { return dir > 1 ? 2 : 0; }
  // 水平镜像：dir 1/3 → -1（scaleX 取负），dir 0/2 → 1
  function flipOf(dir)    { return (dir === 1 || dir === 3) ? -1 : 1; }
  MCSim.calcDirection = calcDirection;
  MCSim.resDirOf      = resDirOf;
  MCSim.flipOf        = flipOf;

  // 在 (cx,cy) 附近 MAX_PATH_DIST 格内找一个随机可走目标
  function randomNearbyWalkable(cx, cy) {
    var r = MAX_PATH_DIST;
    for (var t = 0; t < 30; t++) {
      var nx = cx + Math.floor((Math.random() * 2 - 1) * r);
      var ny = cy + Math.floor((Math.random() * 2 - 1) * r);
      nx = Math.max(0, Math.min(MAP_CELL_W - 1, nx));
      ny = Math.max(0, Math.min(MAP_CELL_H - 1, ny));
      if (_mapLoaded ? _pfGrid.isWalkableAt(nx, ny) : true) return { x: nx, y: ny };
    }
    return { x: cx, y: cy };
  }

  // -------- 构造 --------
  function MCSim(variant, width, height) {
    this.variant = 'M2';
    this.width   = width  || MAP_W_PX;
    this.height  = height || MAP_H_PX;
    this.list    = [];
    this._clock  = 0;
    this._pathQueue = [];
  }

  MCSim.prototype.add = function (n) {
    for (var i = 0; i < n; i++) this.list.push(this._spawn(this.list.length));
  };

  MCSim.prototype.remove = function (n) {
    this.list.length = Math.max(0, this.list.length - n);
  };

  MCSim.prototype._spawn = function (idx) {
    var v      = this.variant;
    // 真实多人场景固定 8 职业轮换
    var charId = CHARACTERS[idx % CHARACTERS.length];
    var cell   = randomWalkable();

    var f = {
      charId:   charId,
      animName: 'walk',
      dir: 0,
      x: cell.x * CELL_SIZE,
      y: cell.y * CELL_SIZE,
      cx: cell.x, cy: cell.y,
      path:      null,
      pathIdx:   0,
      // 游戏 NPC 移动速度：MAPGROUP_NPC_MOVE_SPEED = 100 px/s = 0.1 px/ms
      speed:     (80 + Math.random() * 40) * 0.001,  // 0.08~0.12 px/ms，对应 80~120 px/s
      targetCx:  -1, targetCy: -1,
      needPath:  true,
      nextWalkAt: 0
    };

    this._pathQueue.push(idx);
    // 地图未就绪时记录，就绪后统一校正位置到真实可走格
    if (!_mapLoaded) _pendingInstances.push(f);
    return f;
  };

  /**
   * 每帧推进（所有变体寻路 + 移动）
   * 返回需要更新动画的角色 { idx, animName, x, y }[]
   */
  /**
   * 计算并（在方向变化时）更新某角色当前路段的朝向
   * 与游戏一致：direction = calcDirection(当前点, 目标路点)，每路段只算一次
   */
  function setSegmentDir(agent, i, updates) {
    if (!agent.path || agent.pathIdx >= agent.path.length) return;
    var node = agent.path[agent.pathIdx];
    var tx = node[0] * CELL_SIZE;
    var ty = node[1] * CELL_SIZE;
    var nd = calcDirection(agent.x, agent.y, tx, ty);
    if (nd !== agent.dir) {
      agent.dir = nd;
      updates.push({ idx: i, animName: agent.animName, x: agent.x, y: agent.y, dir: nd, dirChange: true });
    }
  }

  MCSim.prototype.update = function (dtMs) {
    this._clock += dtMs || 16.7;
    var updates = [];
    var list = this.list;
    var q = this._pathQueue;

    // 游戏 SceneRandomWalkComponent：到达后 STATE_WAIT，等待 500~1500ms 才进入 READY_WALK。
    for (var wi = 0; wi < list.length; wi++) {
      var waiting = list[wi];
      if (waiting && waiting.needPath && !waiting.path && this._clock >= waiting.nextWalkAt) {
        waiting.needPath = false;
        q.push(wi);
      }
    }

    // 游戏按路径段依次 tween；这里保持同样的“整段定向 + 匀速抵达路点”语义，
    // 并分帧限制 A* 数量以避免同帧寻路峰值。
    var pCount = 0;
    while (q.length > 0 && pCount < MAX_PATHFIND_PER_FRAME) {
      var idx = q.shift();
      var f = list[idx];
      if (!f || f.path) continue;
      var target = randomNearbyWalkable(f.cx, f.cy);
      var path = findPath(f.cx, f.cy, target.x, target.y);
      if (!path || path.length < 2) {
        f.needPath = true;
        f.nextWalkAt = this._clock + RANDOM_WALK_WAIT_MIN + Math.random() * RANDOM_WALK_WAIT_JITTER;
        continue;
      }
      f.targetCx = target.x;
      f.targetCy = target.y;
      f.path = path;
      f.pathIdx = 1;
      if (f.animName !== 'walk') {
        f.animName = 'walk';
        updates.push({ idx: idx, animName: 'walk', x: f.x, y: f.y });
      }
      setSegmentDir(f, idx, updates);
      pCount++;
    }

    for (var i = 0; i < list.length; i++) {
      var agent = list[i];
      if (!agent || !agent.path || agent.pathIdx >= agent.path.length) continue;
      var targetNode = agent.path[agent.pathIdx];
      var tx = targetNode[0] * CELL_SIZE;
      var ty = targetNode[1] * CELL_SIZE;
      var dx = tx - agent.x, dy = ty - agent.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var move = agent.speed * (dtMs || 16.7);

      if (dist <= move) {
        agent.x = tx;
        agent.y = ty;
        agent.cx = targetNode[0];
        agent.cy = targetNode[1];
        agent.pathIdx++;
        if (agent.pathIdx >= agent.path.length) {
          agent.path = null;
          agent.animName = 'stand';
          agent.needPath = true;
          agent.nextWalkAt = this._clock + RANDOM_WALK_WAIT_MIN + Math.random() * RANDOM_WALK_WAIT_JITTER;
          updates.push({ idx: i, animName: 'stand', x: agent.x, y: agent.y, dir: agent.dir });
        } else {
          setSegmentDir(agent, i, updates);
        }
      } else {
        agent.x += dx / dist * move;
        agent.y += dy / dist * move;
      }
    }

    return updates;  };

  global.MCSim = MCSim;
})(typeof window !== 'undefined' ? window : globalThis);
