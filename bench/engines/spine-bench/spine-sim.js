/**
 * SpineSim — 骨骼动画场景仿真核心（引擎无关）
 *
 * 变体：
 *  S1 同一角色（狐美人）× N，idle/walk 游走   → 测同骨架合批 + 蒙皮成本
 *  S2 8 种角色混合，idle/walk 游走             → 测多骨架破批
 *
 * 寻路：内置轻量 A*（移植自游戏 src/lib/astar.ts），
 *       角色只在可通行格子内移动，walk 时真正沿路径走动。
 *
 * update() 返回本帧位置或动画变化的角色下标数组（changed[]）。
 */
(function (global) {
  'use strict';

  // ——— 资源常量 ———
  var CHARACTERS = [
    'vx_role_humeiren',   // [0] 狐美人 — S1 固定使用
    'vx_role_hutouren',
    'vx_role_jijianhun',
    'vx_role_qiaoqianjin',
    'vx_role_shentianbing',
    'vx_role_wutianji',
    'vx_role_xiaoyaosheng',
    'vx_role_yexiling'
  ];

  // 参与游走的动画（die 不含，非循环播完会停帧）
  var ANIMS = ['idle', 'walk'];

  var CHAR_SCALE = 0.6;
  var CELL_SIZE  = 60;   // px（同游戏 MAPGROUP_CELL_SIZE）
  var WALK_SPEED = 120;  // px/s

  // =====================================================================
  // NavGrid — 轻量 A*（逻辑源自 h5client_s2/src/lib/astar.ts）
  // Uint8Array 位图，bit=1 = 不可走，同游戏
  // =====================================================================
  function NavGrid(cellW, cellH) {
    this.cellW = cellW;
    this.cellH = cellH;
    this.data  = new Uint8Array(Math.ceil(cellW * cellH / 8));
  }

  NavGrid.prototype.setWalkable = function (cx, cy, walkable) {
    var idx = cy * this.cellW + cx;
    var i   = Math.floor(idx / 8);
    var bit = 7 - (idx % 8);
    if (walkable) this.data[i] &= ~(1 << bit);
    else          this.data[i] |=  (1 << bit);
  };

  NavGrid.prototype.isWalkable = function (cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.cellW || cy >= this.cellH) return false;
    var idx = cy * this.cellW + cx;
    return !(this.data[Math.floor(idx / 8)] & (1 << (7 - idx % 8)));
  };

  NavGrid.prototype.findPath = function (sx, sy, ex, ey) {
    if (!this.isWalkable(ex, ey)) return [];
    if (sx === ex && sy === ey) return [[sx, sy]];

    var w = this.cellW, INF = 1e9, SQRT2 = Math.SQRT2;
    var nodeAt = {};
    function getNode(x, y) {
      var k = y * w + x;
      if (!nodeAt[k]) nodeAt[k] = { x: x, y: y, g: INF, f: INF, h: 0, opened: false, closed: false, parent: null };
      return nodeAt[k];
    }

    var start = getNode(sx, sy), end = getNode(ex, ey);
    start.g = 0; start.f = 0; start.opened = true;

    var open = [start];
    function heapPush(n) {
      open.push(n);
      var i = open.length - 1;
      while (i > 0) { var p = (i-1)>>1; if (open[p].f > open[i].f) { var t=open[p];open[p]=open[i];open[i]=t;i=p; } else break; }
    }
    function heapPop() {
      var top = open[0], last = open.pop();
      if (open.length) {
        open[0] = last;
        var i = 0, n = open.length;
        while (true) { var l=2*i+1,r=2*i+2,s=i; if(l<n&&open[l].f<open[s].f)s=l; if(r<n&&open[r].f<open[s].f)s=r; if(s===i)break; var t=open[s];open[s]=open[i];open[i]=t;i=s; }
      }
      return top;
    }
    function heapUpdate(node) {
      var i = open.indexOf(node);
      if (i < 0) return;
      while (i > 0) { var p=(i-1)>>1; if(open[p].f>open[i].f){var t=open[p];open[p]=open[i];open[i]=t;i=p;}else break; }
    }

    var DX=[ 0,1,0,-1, 1, 1,-1,-1];
    var DY=[-1,0,1, 0,-1, 1, 1,-1];
    var DC=[ 1,1,1, 1,SQRT2,SQRT2,SQRT2,SQRT2];

    while (open.length) {
      var node = heapPop();
      node.closed = true;
      if (node === end) break;
      for (var d = 0; d < 8; d++) {
        var nx = node.x + DX[d], ny = node.y + DY[d];
        if (!this.isWalkable(nx, ny)) continue;
        if (d >= 4 && (!this.isWalkable(node.x, ny) || !this.isWalkable(nx, node.y))) continue;
        var nb = getNode(nx, ny);
        if (nb.closed) continue;
        var ng = node.g + DC[d];
        if (!nb.opened || ng < nb.g) {
          nb.g = ng; nb.h = nb.h || Math.sqrt((nx-ex)*(nx-ex)+(ny-ey)*(ny-ey)); nb.f = nb.g + nb.h;
          nb.parent = node;
          if (!nb.opened) { nb.opened = true; heapPush(nb); } else heapUpdate(nb);
        }
      }
    }

    if (!end.parent && end !== start) return [];
    var path = [], cur = end;
    while (cur) { path.push([cur.x, cur.y]); cur = cur.parent; }
    path.reverse();
    return this._smoothPath(path);
  };

  NavGrid.prototype._smoothPath = function (path) {
    var len = path.length;
    if (len <= 2) return path;
    var newPath = [path[0]], sx = path[0][0], sy = path[0][1];
    for (var i = 2; i < len; i++) {
      var line = this._interpolate(sx, sy, path[i][0], path[i][1]);
      var blocked = false;
      for (var j = 1; j < line.length; j++) {
        if (!this.isWalkable(line[j][0], line[j][1])) { blocked = true; break; }
        var xb = line[j-1][0], yb = line[j-1][1];
        if (Math.abs(xb-line[j][0]) + Math.abs(yb-line[j][1]) > 1) {
          if (!this.isWalkable(line[j][0], yb) || !this.isWalkable(xb, line[j][1])) { blocked = true; break; }
        }
      }
      if (blocked) { newPath.push(path[i-1]); sx = path[i-1][0]; sy = path[i-1][1]; }
    }
    newPath.push(path[len-1]);
    return newPath;
  };

  NavGrid.prototype._interpolate = function (x0, y0, x1, y1) {
    var line = [], dx = Math.abs(x1-x0), dy = Math.abs(y1-y0);
    var sx = x0<x1?1:-1, sy = y0<y1?1:-1, err = dx-dy, x=x0, y=y0;
    while (true) {
      line.push([x, y]);
      if (x===x1 && y===y1) break;
      var e2 = 2*err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 <  dx) { err += dx; y += sy; }
    }
    return line;
  };

  // =====================================================================
  // 可行走区域（格子坐标）— 仅底部地面，避免角色出现在天空
  // =====================================================================
  var SCENE_W = 1280, SCENE_H = 720;
  var GRID_W  = Math.ceil(SCENE_W / CELL_SIZE);  // 22
  var GRID_H  = Math.ceil(SCENE_H / CELL_SIZE);  // 12

  // [minCx, minCy, maxCx, maxCy]（含两端）
  var WALKABLE_RECTS = [
    [0,  8, 21, 11],  // 全宽地面主道（底部）
    [2,  6,  9,  8],  // 左侧近景支路
    [12, 6, 19,  8],  // 右侧近景支路
  ];

  function buildNavGrid() {
    var grid = new NavGrid(GRID_W, GRID_H);
    for (var y = 0; y < GRID_H; y++)
      for (var x = 0; x < GRID_W; x++)
        grid.setWalkable(x, y, false);
    for (var r = 0; r < WALKABLE_RECTS.length; r++) {
      var rect = WALKABLE_RECTS[r];
      for (var cy = rect[1]; cy <= rect[3]; cy++)
        for (var cx = rect[0]; cx <= rect[2]; cx++)
          grid.setWalkable(cx, cy, true);
    }
    return grid;
  }

  var _navGrid = buildNavGrid();

  function worldToCell(wx, wy) {
    return {
      x: Math.max(0, Math.min(GRID_W-1, Math.floor(wx / CELL_SIZE))),
      y: Math.max(0, Math.min(GRID_H-1, Math.floor(wy / CELL_SIZE)))
    };
  }
  function cellToWorld(cx, cy) {
    return { x: cx * CELL_SIZE + CELL_SIZE / 2, y: cy * CELL_SIZE + CELL_SIZE / 2 };
  }
  function randomWalkablePos() {
    var r  = WALKABLE_RECTS[Math.floor(Math.random() * WALKABLE_RECTS.length)];
    var cx = r[0] + Math.floor(Math.random() * (r[2] - r[0] + 1));
    var cy = r[1] + Math.floor(Math.random() * (r[3] - r[1] + 1));
    return cellToWorld(cx, cy);
  }

  // =====================================================================
  // SpineSim
  // =====================================================================
  function SpineSim(variant, width, height) {
    this.variant = variant || 'S1';
    this.width   = width  || SCENE_W;
    this.height  = height || SCENE_H;
    this.list    = [];
    this._clock  = 0;
  }

  SpineSim.CHARACTERS      = CHARACTERS;
  SpineSim.ANIMS           = ANIMS;
  SpineSim.CHAR_SCALE      = CHAR_SCALE;
  SpineSim.NAV_GRID        = _navGrid;
  SpineSim.WALKABLE_RECTS  = WALKABLE_RECTS;
  SpineSim.CELL_SIZE       = CELL_SIZE;

  SpineSim.prototype.add = function (n) {
    for (var i = 0; i < n; i++) this.list.push(this._spawn(this.list.length));
  };

  SpineSim.prototype.remove = function (n) {
    this.list.length = Math.max(0, this.list.length - n);
  };

  SpineSim.prototype._spawn = function (idx) {
    // S1 固定狐美人；S2 按下标轮换 8 种角色
    var charKey = (this.variant === 'S2') ? CHARACTERS[idx % CHARACTERS.length] : CHARACTERS[0];
    var pos = randomWalkablePos();
    return {
      charKey:  charKey,
      animName: 'idle',
      x: pos.x,
      y: pos.y,
      scale:    CHAR_SCALE,
      _path:    [],
      _pathIdx: 0,
      _moving:  false,
      _waitUntil: 0
    };
  };

  /**
   * 每帧推进。dtMs 为帧时间毫秒。
   * 返回本帧位置或动画发生变化的角色下标数组。
   */
  SpineSim.prototype.update = function (dtMs) {
    this._clock += dtMs || 16.7;
    var dt = (dtMs || 16.7) / 1000;
    var changed = [];
    var list = this.list;

    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      var dirty = false;

      // 移动推进
      if (f._moving && f._path.length > 0) {
        dirty = this._stepMove(f, dt) || dirty;
      }

      // 到达终点后等待一段时间，再寻下一段路
      if (!f._moving) {
        if (this._clock >= f._waitUntil) {
          this._assignNewPath(f);
          dirty = true;
        }
      }

      if (dirty) changed.push(i);
    }

    return changed;
  };

  SpineSim.prototype._stepMove = function (f, dt) {
    var remain = WALK_SPEED * dt, moved = false;
    while (remain > 0 && f._pathIdx < f._path.length) {
      var target = f._path[f._pathIdx];
      var dx = target[0] - f.x, dy = target[1] - f.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= remain) {
        f.x = target[0]; f.y = target[1];
        remain -= dist; f._pathIdx++; moved = true;
      } else {
        var r = remain / dist;
        f.x += dx * r; f.y += dy * r;
        remain = 0; moved = true;
      }
    }
    if (f._pathIdx >= f._path.length) {
      f._moving = false; f._path = []; f._pathIdx = 0;
      if (f.animName === 'walk') {
        f.animName = 'idle';
        f._waitUntil = this._clock + 1000 + Math.random() * 2000;
      }
    }
    return moved;
  };

  SpineSim.prototype._assignNewPath = function (f) {
    var dest = randomWalkablePos();
    var sc   = worldToCell(f.x, f.y);
    var ec   = worldToCell(dest.x, dest.y);
    var cellPath = _navGrid.findPath(sc.x, sc.y, ec.x, ec.y);
    if (cellPath.length < 2) {
      var safe = randomWalkablePos();
      f.x = safe.x; f.y = safe.y; return;
    }
    f._path = [];
    for (var k = 1; k < cellPath.length; k++) {
      var wp = cellToWorld(cellPath[k][0], cellPath[k][1]);
      f._path.push([wp.x, wp.y]);
    }
    f._pathIdx = 0;
    f._moving  = true;
    f.animName = 'walk';
    f._waitUntil = 0;
  };

  global.SpineSim = SpineSim;
})(typeof window !== 'undefined' ? window : globalThis);

(function (global) {
  'use strict';

  // ——— 资源常量 ———
  var CHARACTERS = [
    'vx_role_humeiren',
    'vx_role_hutouren',
    'vx_role_jijianhun',
    'vx_role_qiaoqianjin',
    'vx_role_shentianbing',
    'vx_role_wutianji',
    'vx_role_xiaoyaosheng',
    'vx_role_yexiling'
  ];

  // 可切换动画（die 不含，非循环动画播完会停帧）
  var ANIMS = ['idle', 'walk', 'attack', 'skill'];

  var CHAR_SCALE = 0.6;
  var CELL_SIZE  = 60;   // px，与格子宽高对应（同游戏 MAPGROUP_CELL_SIZE）
  var WALK_SPEED = 120;  // px/s，角色移动速度

  // S3 动画切换间隔（ms）
  var ANIM_SWITCH_MS = 3000;

  // =====================================================================
  // NavGrid — 轻量 A* 寻路，逻辑源自 h5client_s2/src/lib/astar.ts
  // 格子数据存在 Uint8Array，每 8 格一字节，bit=1 表示不可走（同游戏）
  // =====================================================================
  function NavGrid(cellW, cellH) {
    this.cellW = cellW;
    this.cellH = cellH;
    // 初始全可走（全 0）
    var byteLen = Math.ceil(cellW * cellH / 8);
    this.data = new Uint8Array(byteLen);
  }

  /** 设置格子可行走性 walkable=false 表示阻挡 */
  NavGrid.prototype.setWalkable = function (cx, cy, walkable) {
    var idx = cy * this.cellW + cx;
    var i   = Math.floor(idx / 8);
    var bit = 7 - (idx % 8);
    if (walkable) {
      this.data[i] &= ~(1 << bit);
    } else {
      this.data[i] |=  (1 << bit);
    }
  };

  NavGrid.prototype.isWalkable = function (cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.cellW || cy >= this.cellH) return false;
    var idx = cy * this.cellW + cx;
    var i   = Math.floor(idx / 8);
    var bit = 7 - (idx % 8);
    return !(this.data[i] & (1 << bit));
  };

  /** A* 寻路，返回格子坐标数组 [[cx,cy], ...] 或 [] */
  NavGrid.prototype.findPath = function (sx, sy, ex, ey) {
    if (!this.isWalkable(ex, ey)) return [];
    if (sx === ex && sy === ey) return [[sx, sy]];

    var w = this.cellW, h = this.cellH;
    var INF = 1e9;

    // 节点池（对象复用避免 GC）
    var nodeAt = {};
    function getNode(x, y) {
      var k = y * w + x;
      if (!nodeAt[k]) nodeAt[k] = { x: x, y: y, g: INF, f: INF, h: 0, opened: false, closed: false, parent: null };
      return nodeAt[k];
    }

    var start = getNode(sx, sy);
    var end   = getNode(ex, ey);
    start.g = 0; start.f = 0; start.opened = true;

    // 最小堆（简单数组实现，规模小够用）
    var open = [start];
    function heapPush(node) {
      open.push(node);
      var i = open.length - 1;
      while (i > 0) {
        var p = (i - 1) >> 1;
        if (open[p].f > open[i].f) { var t = open[p]; open[p] = open[i]; open[i] = t; i = p; }
        else break;
      }
    }
    function heapPop() {
      var top = open[0];
      var last = open.pop();
      if (open.length) {
        open[0] = last;
        var i = 0, n = open.length;
        while (true) {
          var l = 2*i+1, r = 2*i+2, s = i;
          if (l < n && open[l].f < open[s].f) s = l;
          if (r < n && open[r].f < open[s].f) s = r;
          if (s === i) break;
          var t = open[s]; open[s] = open[i]; open[i] = t; i = s;
        }
      }
      return top;
    }
    function heapUpdate(node) {
      // 重新排序（值变小时上浮）
      var i = open.indexOf(node);
      if (i < 0) return;
      while (i > 0) {
        var p = (i - 1) >> 1;
        if (open[p].f > open[i].f) { var t = open[p]; open[p] = open[i]; open[i] = t; i = p; }
        else break;
      }
    }

    var SQRT2 = Math.SQRT2;
    var abs = Math.abs;
    // 启发函数：Euclidean
    function h(ax, ay) { return Math.sqrt((ax - ex)*(ax - ex) + (ay - ey)*(ay - ey)); }

    var DX = [ 0, 1, 0,-1,  1, 1,-1,-1];
    var DY = [-1, 0, 1, 0, -1, 1, 1,-1];
    var DC = [ 1, 1, 1, 1,  SQRT2, SQRT2, SQRT2, SQRT2];

    while (open.length) {
      var node = heapPop();
      node.closed = true;
      if (node === end) break;

      for (var d = 0; d < 8; d++) {
        var nx = node.x + DX[d], ny = node.y + DY[d];
        if (!this.isWalkable(nx, ny)) continue;
        // 对角线移动需要两侧都可走（OnlyWhenNoObstacles，同游戏）
        if (d >= 4) {
          if (!this.isWalkable(node.x, ny) || !this.isWalkable(nx, node.y)) continue;
        }
        var nb = getNode(nx, ny);
        if (nb.closed) continue;
        var ng = node.g + DC[d];
        if (!nb.opened || ng < nb.g) {
          nb.g = ng;
          nb.h = nb.h || h(nx, ny);
          nb.f = nb.g + nb.h;
          nb.parent = node;
          if (!nb.opened) { nb.opened = true; heapPush(nb); }
          else heapUpdate(nb);
        }
      }
    }

    if (!end.parent && end !== start) return [];

    // 回溯路径
    var path = [];
    var cur = end;
    while (cur) { path.push([cur.x, cur.y]); cur = cur.parent; }
    path.reverse();

    // 路径平滑（源自游戏 smoothenPathWithConnerTest）
    return this._smoothPath(path);
  };

  NavGrid.prototype._smoothPath = function (path) {
    var len = path.length;
    if (len <= 2) return path;
    var newPath = [path[0]];
    var sx = path[0][0], sy = path[0][1];

    for (var i = 2; i < len; i++) {
      var ex = path[i][0], ey = path[i][1];
      var line = this._interpolate(sx, sy, ex, ey);
      var blocked = false;
      for (var j = 1; j < line.length; j++) {
        if (!this.isWalkable(line[j][0], line[j][1])) { blocked = true; break; }
        var xb = line[j-1][0], yb = line[j-1][1];
        if (Math.abs(xb - line[j][0]) + Math.abs(yb - line[j][1]) > 1) {
          if (!this.isWalkable(line[j][0], yb) || !this.isWalkable(xb, line[j][1])) { blocked = true; break; }
        }
      }
      if (blocked) {
        newPath.push(path[i-1]);
        sx = path[i-1][0]; sy = path[i-1][1];
      }
    }
    newPath.push(path[len-1]);
    return newPath;
  };

  // Bresenham 直线插值（格子坐标）
  NavGrid.prototype._interpolate = function (x0, y0, x1, y1) {
    var abs = Math.abs, line = [], dx = abs(x1-x0), dy = abs(y1-y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var err = dx - dy, x = x0, y = y0;
    while (true) {
      line.push([x, y]);
      if (x === x1 && y === y1) break;
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx)  { err += dx; y += sy; }
    }
    return line;
  };

  // =====================================================================
  // 场景可行走区域定义（1280×720，格子 60px）
  // 参考游戏地图格子阻挡逻辑：只定义可走的矩形区域，其余全为阻挡
  // =====================================================================
  var SCENE_W = 1280, SCENE_H = 720;
  var GRID_W = Math.ceil(SCENE_W / CELL_SIZE);  // 22
  var GRID_H = Math.ceil(SCENE_H / CELL_SIZE);  // 12

  // 可行走区域（格子坐标矩形）：仅限地面区域，避免角色出现在天空
  // 1280×720 场景，CELL_SIZE=60 → GRID_H=12 行
  //   行 8~11  → 世界 y ≈ 480~720（地面主道）
  //   行 6~8   → 世界 y ≈ 360~510（近景台阶/支路）
  // [minCx, minCy, maxCx, maxCy]（含两端）
  var WALKABLE_RECTS = [
    [0,  8, 21, 11],  // 全宽地面主道（底部）
    [2,  6,  9,  8],  // 左侧近景支路
    [12, 6, 19,  8],  // 右侧近景支路
  ];

  function buildNavGrid() {
    var grid = new NavGrid(GRID_W, GRID_H);
    // 先全部设不可走
    for (var y = 0; y < GRID_H; y++)
      for (var x = 0; x < GRID_W; x++)
        grid.setWalkable(x, y, false);
    // 再把可走区域打开
    for (var r = 0; r < WALKABLE_RECTS.length; r++) {
      var rect = WALKABLE_RECTS[r];
      for (var cy = rect[1]; cy <= rect[3]; cy++)
        for (var cx = rect[0]; cx <= rect[2]; cx++)
          grid.setWalkable(cx, cy, true);
    }
    return grid;
  }

  // 全局共享 navGrid（三引擎同一份逻辑）
  var _navGrid = buildNavGrid();

  // 世界坐标 → 格子坐标
  function worldToCell(wx, wy) {
    return {
      x: Math.max(0, Math.min(GRID_W - 1, Math.floor(wx / CELL_SIZE))),
      y: Math.max(0, Math.min(GRID_H - 1, Math.floor(wy / CELL_SIZE)))
    };
  }
  // 格子坐标 → 世界坐标（格子中心）
  function cellToWorld(cx, cy) {
    return { x: cx * CELL_SIZE + CELL_SIZE / 2, y: cy * CELL_SIZE + CELL_SIZE / 2 };
  }

  // 从可行走格子中随机取一个世界坐标
  function randomWalkablePos() {
    var r = WALKABLE_RECTS[Math.floor(Math.random() * WALKABLE_RECTS.length)];
    var cx = r[0] + Math.floor(Math.random() * (r[2] - r[0] + 1));
    var cy = r[1] + Math.floor(Math.random() * (r[3] - r[1] + 1));
    return cellToWorld(cx, cy);
  }

  // ========================
  // SpineSim
  // =====================================================================
  function SpineSim(variant, width, height) {
    this.variant = variant || 'S1';
    this.width   = width  || SCENE_W;
    this.height  = height || SCENE_H;
    this.list    = [];
    this._clock  = 0;
    this._animSwitchMs = ANIM_SWITCH_MS;
  }

  SpineSim.CHARACTERS  = CHARACTERS;
  SpineSim.ANIMS       = ANIMS;
  SpineSim.CHAR_SCALE  = CHAR_SCALE;
  SpineSim.NAV_GRID    = _navGrid;        // 暴露给适配器（可视化调试用）
  SpineSim.WALKABLE_RECTS = WALKABLE_RECTS;
  SpineSim.CELL_SIZE   = CELL_SIZE;

  SpineSim.prototype.add = function (n) {
    for (var i = 0; i < n; i++) this.list.push(this._spawn(this.list.length));
  };

  SpineSim.prototype.remove = function (n) {
    this.list.length = Math.max(0, this.list.length - n);
  };

  SpineSim.prototype._spawn = function (idx) {
    var v = this.variant;
    var charKey = (v === 'S2') ? CHARACTERS[idx % CHARACTERS.length] : CHARACTERS[0];
    var animName = (v === 'S3') ? ANIMS[Math.floor(Math.random() * ANIMS.length)] : 'idle';

    var pos = randomWalkablePos();
    return {
      charKey:  charKey,
      animName: animName,
      x: pos.x,
      y: pos.y,
      scale: CHAR_SCALE,
      // 寻路状态
      _path:    [],       // 待走的世界坐标点 [[wx,wy],...]
      _pathIdx: 0,
      _moving:  false,
      // S3 动画切换计时
      _nextSwitch: this._clock + this._animSwitchMs * (0.5 + Math.random())
    };
  };

  /**
   * 每帧推进。dtMs 为帧时间毫秒。
   * 返回本帧发生变化（位置 or 动画）的角色下标数组。
   * 适配器拿到 changed[] 后需同步对应精灵的 x/y/animName。
   */
  SpineSim.prototype.update = function (dtMs) {
    this._clock += dtMs || 16.7;
    var dt = (dtMs || 16.7) / 1000;  // 转秒
    var changed = [];
    var list = this.list;

    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      var dirty = false;

      // —— 移动推进 ——
      if (f._moving && f._path.length > 0) {
        dirty = this._stepMove(f, dt) || dirty;
      }

      // —— S3 动画切换 ——
      if (this.variant === 'S3' && this._clock >= f._nextSwitch) {
        var candidates = ANIMS.filter(function (a) { return a !== f.animName; });
        var pool = candidates.length > 0 ? candidates : ANIMS;
        var next = pool[Math.floor(Math.random() * pool.length)];
        f.animName = next;
        dirty = true;
        f._nextSwitch = this._clock + this._animSwitchMs * (0.5 + Math.random());
        // 动画切到 walk 时派发新路径，其他动画停在原地
        if (next === 'walk') {
          this._assignNewPath(f);
        } else {
          f._moving = false;
          f._path = [];
        }
      }

      // —— S1/S2：角色持续在地图上随机游走 ——
      if (this.variant !== 'S3' && !f._moving) {
        // 到达终点后随机等待 1~3s 再走下一段
        if (!f._waitUntil || this._clock >= f._waitUntil) {
          this._assignNewPath(f);
          f._waitUntil = 0;
        }
      }

      if (dirty) changed.push(i);
    }

    return changed;
  };

  /** 沿路径移动一帧，返回是否有位置变化 */
  SpineSim.prototype._stepMove = function (f, dt) {
    var speed = WALK_SPEED;
    var moved = false;
    var remain = speed * dt;

    while (remain > 0 && f._pathIdx < f._path.length) {
      var target = f._path[f._pathIdx];
      var dx = target[0] - f.x;
      var dy = target[1] - f.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= remain) {
        f.x = target[0];
        f.y = target[1];
        remain -= dist;
        f._pathIdx++;
        moved = true;
      } else {
        var ratio = remain / dist;
        f.x += dx * ratio;
        f.y += dy * ratio;
        remain = 0;
        moved = true;
      }
    }

    // 到达终点
    if (f._pathIdx >= f._path.length) {
      f._moving  = false;
      f._path    = [];
      f._pathIdx = 0;
      // S1/S2：到达后切 idle，等待下次游走
      if (this.variant !== 'S3' && f.animName === 'walk') {
        f.animName = 'idle';
        f._waitUntil = this._clock + 1000 + Math.random() * 2000;
      }
    }

    return moved;
  };

  /** 给角色分配一条新的随机可行走路径，同时切 walk 动画 */
  SpineSim.prototype._assignNewPath = function (f) {
    var dest = randomWalkablePos();
    var sc = worldToCell(f.x, f.y);
    var ec = worldToCell(dest.x, dest.y);

    var cellPath = _navGrid.findPath(sc.x, sc.y, ec.x, ec.y);
    if (cellPath.length < 2) {
      // 起终点相同或寻路失败：瞬移到随机可走点重试
      var safe = randomWalkablePos();
      f.x = safe.x; f.y = safe.y;
      return;
    }

    // 格子路径 → 世界坐标路径（跳过起点，从第 1 个点开始走）
    f._path = [];
    for (var k = 1; k < cellPath.length; k++) {
      var wp = cellToWorld(cellPath[k][0], cellPath[k][1]);
      f._path.push([wp.x, wp.y]);
    }
    f._pathIdx = 0;
    f._moving  = true;
    f.animName = 'walk';
  };

  global.SpineSim = SpineSim;
})(typeof window !== 'undefined' ? window : globalThis);
