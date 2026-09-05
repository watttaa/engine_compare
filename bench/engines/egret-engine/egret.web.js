var egret = window.egret;var __reflect = (this && this.__reflect) || function (p, c, t) {
    p.__class__ = c, t ? t.push(c) : t = [c], p.__types__ = p.__types__ ? t.concat(p.__types__) : t;
};
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var WebGeolocation = /** @class */ (function (_super) {
            __extends(WebGeolocation, _super);
            /**
             * @private
             */
            function WebGeolocation(option) {
                var _this = _super.call(this) || this;
                /**
                 * @private
                 */
                _this.onUpdate = function (position) {
                    var event = new egret.GeolocationEvent(egret.Event.CHANGE);
                    var coords = position.coords;
                    event.altitude = coords.altitude;
                    event.heading = coords.heading;
                    event.accuracy = coords.accuracy;
                    event.latitude = coords.latitude;
                    event.longitude = coords.longitude;
                    event.speed = coords.speed;
                    event.altitudeAccuracy = coords.altitudeAccuracy;
                    _this.dispatchEvent(event);
                };
                /**
                 * @private
                 */
                _this.onError = function (error) {
                    var errorType = egret.GeolocationEvent.UNAVAILABLE;
                    if (error.code == error.PERMISSION_DENIED)
                        errorType = egret.GeolocationEvent.PERMISSION_DENIED;
                    var event = new egret.GeolocationEvent(egret.IOErrorEvent.IO_ERROR);
                    event.errorType = errorType;
                    event.errorMessage = error.message;
                    _this.dispatchEvent(event);
                };
                _this.geolocation = navigator.geolocation;
                return _this;
            }
            /**
             * @private
             *
             */
            WebGeolocation.prototype.start = function () {
                var geo = this.geolocation;
                if (geo)
                    this.watchId = geo.watchPosition(this.onUpdate, this.onError);
                else
                    this.onError({
                        code: 2,
                        message: egret.sys.tr(3004),
                        PERMISSION_DENIED: 1,
                        POSITION_UNAVAILABLE: 2
                    });
            };
            /**
             * @private
             *
             */
            WebGeolocation.prototype.stop = function () {
                var geo = this.geolocation;
                geo.clearWatch(this.watchId);
            };
            return WebGeolocation;
        }(egret.EventDispatcher));
        web.WebGeolocation = WebGeolocation;
        __reflect(WebGeolocation.prototype, "egret.web.WebGeolocation", ["egret.Geolocation"]);
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var WebMotion = /** @class */ (function (_super) {
            __extends(WebMotion, _super);
            function WebMotion() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                /**
                 * @private
                 */
                _this.onChange = function (e) {
                    var event = new egret.MotionEvent(egret.Event.CHANGE);
                    var acceleration = {
                        x: e.acceleration.x,
                        y: e.acceleration.y,
                        z: e.acceleration.z
                    };
                    var accelerationIncludingGravity = {
                        x: e.accelerationIncludingGravity.x,
                        y: e.accelerationIncludingGravity.y,
                        z: e.accelerationIncludingGravity.z
                    };
                    var rotation = {
                        alpha: e.rotationRate.alpha,
                        beta: e.rotationRate.beta,
                        gamma: e.rotationRate.gamma
                    };
                    event.acceleration = acceleration;
                    event.accelerationIncludingGravity = accelerationIncludingGravity;
                    event.rotationRate = rotation;
                    _this.dispatchEvent(event);
                };
                return _this;
            }
            /**
             * @private
             *
             */
            WebMotion.prototype.start = function () {
                window.addEventListener("devicemotion", this.onChange);
            };
            /**
             * @private
             *
             */
            WebMotion.prototype.stop = function () {
                window.removeEventListener("devicemotion", this.onChange);
            };
            return WebMotion;
        }(egret.EventDispatcher));
        web.WebMotion = WebMotion;
        __reflect(WebMotion.prototype, "egret.web.WebMotion", ["egret.Motion"]);
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         * 顶点数组管理对象
         * 用来维护顶点数组
         */
        var WebGLVertexArrayObject = /** @class */ (function () {
            function WebGLVertexArrayObject() {
                /*定义顶点格式
                * (x: 8 * 4 = 32) + (y: 8 * 4 = 32) + (u: 8 * 4 = 32) + (v: 8 * 4 = 32) + (tintcolor: 8 * 4 = 32) = (8 * 4 = 32) * (x + y + u + v + tintcolor: 5);
                */
                this.vertSize = 5;
                this.vertByteSize = this.vertSize * 4;
                /**
                 * one quad = 4 Vertex
                 * one quad = 6 Indices
                 */
                this.quadVertexCount = 4;
                this.quadIndicesCount = 6;
                /**
                 * one quad = 4 Vertex & one VertSize = 5
                 * one quad Vertex size = 4 * 5 = 20
                 *
                 * one quad = 6 Indices & one Indices Size = 1
                 * one quad Indices size = 6 * 1 = 6
                 */
                this.quadVertexSize = this.quadVertexCount * this.vertSize;
                this.quadIndicesSize = this.quadIndicesCount * 1;
                /*
                *最多单次提交maxQuadsCount这么多quad
                */
                this.maxQuadsCount = 2048;
                /*
                *quad = 4个Vertex
                */
                this.maxVertexCount = this.maxQuadsCount * 4;
                /*
                *配套的Indices = quad * 6.
                */
                this.maxIndicesCount = this.maxQuadsCount * 6;
                this.vertices = null;
                this.indices = null;
                this.indicesForMesh = null;
                this.vertexIndex = 0;
                this.indexIndex = 0;
                this.hasMesh = false;
                /*
                * refactor:
                */
                this._vertices = null;
                this._verticesFloat32View = null;
                this._verticesUint32View = null;
                //old
                // const numVerts = this.maxVertexCount * this.vertSize;
                // this.vertices = new Float32Array(numVerts);
                ///
                this._vertices = new ArrayBuffer(this.maxVertexCount * this.vertByteSize);
                this._verticesFloat32View = new Float32Array(this._vertices);
                this._verticesUint32View = new Uint32Array(this._vertices);
                this.vertices = this._verticesFloat32View;
                //索引缓冲，最大索引数
                /*
                0-------1
                |       |
                |       |
                3-------2
                0->1->2
                0->2->3
                两个三角形
                */
                var maxIndicesCount = this.maxIndicesCount;
                this.indices = new Uint16Array(maxIndicesCount);
                this.indicesForMesh = new Uint16Array(maxIndicesCount);
                for (var i = 0, j = 0; i < maxIndicesCount; i += 6, j += 4) {
                    this.indices[i + 0] = j + 0;
                    this.indices[i + 1] = j + 1;
                    this.indices[i + 2] = j + 2;
                    this.indices[i + 3] = j + 0;
                    this.indices[i + 4] = j + 2;
                    this.indices[i + 5] = j + 3;
                }
            }
            /**
             * 是否达到最大缓存数量
             */
            WebGLVertexArrayObject.prototype.reachMaxSize = function (vertexCount, indexCount) {
                if (vertexCount === void 0) { vertexCount = 4; }
                if (indexCount === void 0) { indexCount = 6; }
                return this.vertexIndex > this.maxVertexCount - vertexCount || this.indexIndex > this.maxIndicesCount - indexCount;
            };
            /**
             * 获取缓存完成的顶点数组
             */
            WebGLVertexArrayObject.prototype.getVertices = function () {
                var view = this.vertices.subarray(0, this.vertexIndex * this.vertSize);
                return view;
            };
            /**
             * 获取缓存完成的索引数组
             */
            WebGLVertexArrayObject.prototype.getIndices = function () {
                return this.indices;
            };
            /**
             * 获取缓存完成的mesh索引数组
             */
            WebGLVertexArrayObject.prototype.getMeshIndices = function () {
                return this.indicesForMesh;
            };
            /**
             * 切换成mesh索引缓存方式
             */
            WebGLVertexArrayObject.prototype.changeToMeshIndices = function () {
                if (!this.hasMesh) {
                    // 拷贝默认index信息到for mesh中
                    for (var i = 0, l = this.indexIndex; i < l; ++i) {
                        this.indicesForMesh[i] = this.indices[i];
                    }
                    this.hasMesh = true;
                }
            };
            WebGLVertexArrayObject.prototype.isMesh = function () {
                return this.hasMesh;
            };
            /**
             * 获取缓存的顶点数量
             */
            WebGLVertexArrayObject.prototype.getVertexCount = function () {
                return this.vertexIndex;
            };
            WebGLVertexArrayObject.prototype.pop = function () {
            };
            /**
             * 获取缓存的顶点数据大小
             */
            WebGLVertexArrayObject.prototype.getVertexDataSize = function () {
                return this.getVertexCount() * this.vertSize;
            };
            /**
             * 获取缓存的顶点索引数量
             */
            WebGLVertexArrayObject.prototype.getIndicesCount = function () {
                return this.indexIndex;
            };
            /**
             * 合批，调整最后一个quad顶点数据到指定位置
             */
            WebGLVertexArrayObject.prototype.batchArrays = function (dest) {
                var vertexDataSize = this.getVertexDataSize();
                return this.rotateArrays(dest, vertexDataSize - this.quadVertexSize, vertexDataSize - 1);
            };
            WebGLVertexArrayObject.prototype.batchCmd = function (src, dest, srcLen) {
                return this.rotateArrays(dest, src, src + srcLen - 1);
            };
            WebGLVertexArrayObject.prototype.Reverse = function (arr, p, q) {
                for (; p < q; p++, q--) {
                    var tmp = arr[q];
                    arr[q] = arr[p];
                    arr[p] = tmp;
                }
            };
            /**
             *
             * @param firstIndex
             * @param middleIndex
             * @param lastIndex
             */
            WebGLVertexArrayObject.prototype.rotateArrays = function (firstIndex, middleIndex, lastIndex) {
                var maxIdx = this.getVertexDataSize() - 1;
                if (firstIndex < 0 || middleIndex < 0 || lastIndex < 0
                    || firstIndex > maxIdx || middleIndex > maxIdx || lastIndex > maxIdx
                    || firstIndex >= middleIndex || firstIndex >= lastIndex || lastIndex <= middleIndex) {
                    return false;
                }
                // this.Reverse(this.vertices, firstIndex, middleIndex-1);
                // this.Reverse(this.vertices, middleIndex, lastIndex);
                // this.Reverse(this.vertices, firstIndex, lastIndex);
                var tmp = this.vertices.slice(middleIndex, lastIndex + 1);
                this.vertices.copyWithin(firstIndex + (lastIndex - middleIndex) + 1, firstIndex, middleIndex);
                this.vertices.set(tmp, firstIndex);
                return true;
            };
            /**
             * 默认构成矩形
             */
            // private defaultMeshVertices = [0, 0, 1, 0, 1, 1, 0, 1];
            // private defaultMeshUvs = [
            //     0, 0,
            //     1, 0,
            //     1, 1,
            //     0, 1
            // ];
            // private defaultMeshIndices = [0, 1, 2, 0, 2, 3];
            /**
             * 缓存一组顶点
             */
            WebGLVertexArrayObject.prototype.cacheArrays = function (buffer, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureSourceWidth, textureSourceHeight, meshUVs, meshVertices, meshIndices, rotated, colors) {
                var alpha = buffer.globalAlpha;
                /*
                * 混入tintcolor => alpha
                */
                alpha = Math.min(alpha, 1.0);
                var globalTintColor = buffer.globalTintColor || 0xFFFFFF;
                var currentTexture = buffer.currentTexture;
                alpha = ((alpha < 1.0 && currentTexture && currentTexture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL]) ?
                    egret.WebGLUtils.premultiplyTint(globalTintColor, alpha)
                    : globalTintColor + (alpha * 255 << 24));
                /*
                临时测试
                */
                //计算出绘制矩阵，之后把矩阵还原回之前的
                var locWorldTransform = buffer.globalMatrix;
                var a = locWorldTransform.a;
                var b = locWorldTransform.b;
                var c = locWorldTransform.c;
                var d = locWorldTransform.d;
                var tx = locWorldTransform.tx;
                var ty = locWorldTransform.ty;
                var offsetX = buffer.$offsetX;
                var offsetY = buffer.$offsetY;
                if (offsetX != 0 || offsetY != 0) {
                    tx = offsetX * a + offsetY * c + tx;
                    ty = offsetX * b + offsetY * d + ty;
                }
                if (!meshVertices) {
                    if (destX != 0 || destY != 0) {
                        tx = destX * a + destY * c + tx;
                        ty = destX * b + destY * d + ty;
                    }
                    var a1 = destWidth / sourceWidth;
                    if (a1 != 1) {
                        a = a1 * a;
                        b = a1 * b;
                    }
                    var d1 = destHeight / sourceHeight;
                    if (d1 != 1) {
                        c = d1 * c;
                        d = d1 * d;
                    }
                }
                if (meshVertices) {
                    if (web.isIOS14Device()) {
                        var vertData = [];
                        // 计算索引位置与赋值
                        var vertices = this.vertices;
                        var verticesUint32View = this._verticesUint32View;
                        var index = this.vertexIndex * this.vertSize;
                        // 缓存顶点数组
                        var i = 0, iD = 0, l = 0;
                        var u = 0, v = 0, x = 0, y = 0;
                        for (i = 0, l = meshUVs.length; i < l; i += 2) {
                            iD = index + i * 5 / 2;
                            x = meshVertices[i];
                            y = meshVertices[i + 1];
                            u = meshUVs[i];
                            v = meshUVs[i + 1];
                            if (rotated) {
                                vertData.push([
                                    a * x + c * y + tx,
                                    b * x + d * y + ty,
                                    (sourceX + (1.0 - v) * sourceHeight) / textureSourceWidth,
                                    (sourceY + u * sourceWidth) / textureSourceHeight,
                                ]);
                            }
                            else {
                                vertData.push([
                                    a * x + c * y + tx,
                                    b * x + d * y + ty,
                                    (sourceX + u * sourceWidth) / textureSourceWidth,
                                    (sourceY + v * sourceHeight) / textureSourceHeight,
                                ]);
                            }
                            verticesUint32View[iD + 4] = alpha;
                        }
                        for (var i_1 = 0; i_1 < meshIndices.length; i_1 += 3) {
                            var data0 = vertData[meshIndices[i_1]];
                            vertices[index++] = data0[0];
                            vertices[index++] = data0[1];
                            vertices[index++] = data0[2];
                            vertices[index++] = data0[3];
                            verticesUint32View[index++] = alpha;
                            var data1 = vertData[meshIndices[i_1 + 1]];
                            vertices[index++] = data1[0];
                            vertices[index++] = data1[1];
                            vertices[index++] = data1[2];
                            vertices[index++] = data1[3];
                            verticesUint32View[index++] = alpha;
                            var data2 = vertData[meshIndices[i_1 + 2]];
                            vertices[index++] = data2[0];
                            vertices[index++] = data2[1];
                            vertices[index++] = data2[2];
                            vertices[index++] = data2[3];
                            verticesUint32View[index++] = alpha;
                            // 填充数据
                            vertices[index++] = data2[0];
                            vertices[index++] = data2[1];
                            vertices[index++] = data2[2];
                            vertices[index++] = data2[3];
                            verticesUint32View[index++] = alpha;
                        }
                        var meshNum = meshIndices.length / 3;
                        this.vertexIndex += 4 * meshNum;
                        this.indexIndex += 6 * meshNum;
                    }
                    else {
                        // 计算索引位置与赋值
                        var vertices = this.vertices;
                        var verticesUint32View = this._verticesUint32View;
                        var index = this.vertexIndex * this.vertSize;
                        // 缓存顶点数组
                        var i = 0, iD = 0, l = 0;
                        var u = 0, v = 0, x = 0, y = 0;
                        var colorsStarIdx = 0;
                        for (i = 0, l = meshUVs.length; i < l; i += 2) {
                            iD = index + i * 5 / 2;
                            x = meshVertices[i];
                            y = meshVertices[i + 1];
                            u = meshUVs[i];
                            v = meshUVs[i + 1];
                            // xy
                            vertices[iD + 0] = a * x + c * y + tx;
                            vertices[iD + 1] = b * x + d * y + ty;
                            // uv
                            if (rotated) {
                                vertices[iD + 2] = (sourceX + (1.0 - v) * sourceHeight) / textureSourceWidth;
                                vertices[iD + 3] = (sourceY + u * sourceWidth) / textureSourceHeight;
                            }
                            else {
                                vertices[iD + 2] = (sourceX + u * sourceWidth) / textureSourceWidth;
                                vertices[iD + 3] = (sourceY + v * sourceHeight) / textureSourceHeight;
                            }
                            // alpha
                            if (colors) {
                                var r = colors[colorsStarIdx++];
                                var g = colors[colorsStarIdx++];
                                var b_1 = colors[colorsStarIdx++];
                                var a_1 = colors[colorsStarIdx++];
                                alpha = egret.WebGLUtils.formatMeshColors([r, g, b_1, a_1]);
                            }
                            verticesUint32View[iD + 4] = alpha;
                        }
                        // 缓存索引数组
                        if (this.hasMesh) {
                            for (var i_2 = 0, l_1 = meshIndices.length; i_2 < l_1; ++i_2) {
                                this.indicesForMesh[this.indexIndex + i_2] = meshIndices[i_2] + this.vertexIndex;
                            }
                        }
                        this.vertexIndex += meshUVs.length / 2;
                        this.indexIndex += meshIndices.length;
                    }
                }
                else {
                    var width = textureSourceWidth;
                    var height = textureSourceHeight;
                    var w = sourceWidth;
                    var h = sourceHeight;
                    sourceX = sourceX / width;
                    sourceY = sourceY / height;
                    var vertices = this.vertices;
                    var verticesUint32View = this._verticesUint32View;
                    var index = this.vertexIndex * this.vertSize;
                    if (rotated) {
                        var temp = sourceWidth;
                        sourceWidth = sourceHeight / width;
                        sourceHeight = temp / height;
                        // xy
                        vertices[index++] = tx;
                        vertices[index++] = ty;
                        // uv
                        vertices[index++] = sourceWidth + sourceX;
                        vertices[index++] = sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        // xy
                        vertices[index++] = a * w + tx;
                        vertices[index++] = b * w + ty;
                        // uv
                        vertices[index++] = sourceWidth + sourceX;
                        vertices[index++] = sourceHeight + sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        // xy
                        vertices[index++] = a * w + c * h + tx;
                        vertices[index++] = d * h + b * w + ty;
                        // uv
                        vertices[index++] = sourceX;
                        vertices[index++] = sourceHeight + sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        // xy
                        vertices[index++] = c * h + tx;
                        vertices[index++] = d * h + ty;
                        // uv
                        vertices[index++] = sourceX;
                        vertices[index++] = sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                    }
                    else {
                        sourceWidth = sourceWidth / width;
                        sourceHeight = sourceHeight / height;
                        // xy
                        vertices[index++] = tx;
                        vertices[index++] = ty;
                        // uv
                        vertices[index++] = sourceX;
                        vertices[index++] = sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        // xy
                        vertices[index++] = a * w + tx;
                        vertices[index++] = b * w + ty;
                        // uv
                        vertices[index++] = sourceWidth + sourceX;
                        vertices[index++] = sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        // xy
                        vertices[index++] = a * w + c * h + tx;
                        vertices[index++] = d * h + b * w + ty;
                        // uv
                        vertices[index++] = sourceWidth + sourceX;
                        vertices[index++] = sourceHeight + sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        // xy
                        vertices[index++] = c * h + tx;
                        vertices[index++] = d * h + ty;
                        // uv
                        vertices[index++] = sourceX;
                        vertices[index++] = sourceHeight + sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                    }
                    // 缓存索引数组
                    if (this.hasMesh) {
                        var indicesForMesh = this.indicesForMesh;
                        indicesForMesh[this.indexIndex + 0] = 0 + this.vertexIndex;
                        indicesForMesh[this.indexIndex + 1] = 1 + this.vertexIndex;
                        indicesForMesh[this.indexIndex + 2] = 2 + this.vertexIndex;
                        indicesForMesh[this.indexIndex + 3] = 0 + this.vertexIndex;
                        indicesForMesh[this.indexIndex + 4] = 2 + this.vertexIndex;
                        indicesForMesh[this.indexIndex + 5] = 3 + this.vertexIndex;
                    }
                    this.vertexIndex += 4;
                    this.indexIndex += 6;
                }
            };
            WebGLVertexArrayObject.prototype.getTextureAABB = function (index, rect, vertices) {
                var vaoVertices = vertices || this.getVertices();
                var vaoVertSize = this.vertSize;
                var vaoVertexTargetIdx = index;
                /*
                0-------1
                |       |
                |       |
                3-------2
                0->1->2
                0->2->3
                两个三角形
                */
                var isRotate = true;
                var x0 = vaoVertices[vaoVertexTargetIdx];
                var y0 = vaoVertices[vaoVertexTargetIdx + 1];
                var x1 = vaoVertices[vaoVertexTargetIdx + vaoVertSize];
                var y1 = vaoVertices[vaoVertexTargetIdx + vaoVertSize + 1];
                var x2 = vaoVertices[vaoVertexTargetIdx + 2 * vaoVertSize];
                var y2 = vaoVertices[vaoVertexTargetIdx + 2 * vaoVertSize + 1];
                var x3 = vaoVertices[vaoVertexTargetIdx + 3 * vaoVertSize];
                var y3 = vaoVertices[vaoVertexTargetIdx + 3 * vaoVertSize + 1];
                if (x0 == x3 && y0 == y1 && x2 > x0 && y2 > y1) {
                    //没有旋转、翻转(scale-1)
                    isRotate = false;
                }
                if (isRotate) {
                    var minX = x0;
                    var minY = y0;
                    var maxX = minX;
                    var maxY = minY;
                    for (var i = 0; i < 4; i++) {
                        //x,y为左上角
                        var x = vaoVertices[vaoVertexTargetIdx + i * vaoVertSize];
                        var y = vaoVertices[vaoVertexTargetIdx + i * vaoVertSize + 1];
                        minX = Math.min(x, minX);
                        minY = Math.min(y, minY);
                        maxX = Math.max(x, maxX);
                        maxY = Math.max(y, maxY);
                    }
                    rect.x = minX;
                    rect.y = minY;
                    rect.width = maxX - minX;
                    rect.height = maxY - minY;
                }
                else {
                    //x,y为左上角
                    var x = x0;
                    var y = y0;
                    //width = vert1.x - vert0.x
                    var width = Math.abs(x1 - x0);
                    //height = vert1.y - vert2.y
                    var height = Math.abs(y1 - y2);
                    rect.x = x;
                    rect.y = y;
                    rect.width = width;
                    rect.height = height;
                }
            };
            // mike add @see cacheArrays
            WebGLVertexArrayObject.prototype.cacheLastRenderArrays = function (bufferGlobalTintColor, bufferCurrentTexture, bufferGlobalAlpha, bufferGlobalMatrix, bufferOffsetX, bufferOffsetY, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureSourceWidth, textureSourceHeight, meshUVs, meshVertices, meshIndices, rotated) {
                var alpha = bufferGlobalAlpha;
                /*
                * 混入tintcolor => alpha
                */
                alpha = Math.min(alpha, 1.0);
                var globalTintColor = bufferGlobalTintColor || 0xFFFFFF;
                var currentTexture = bufferCurrentTexture;
                alpha = ((alpha < 1.0 && currentTexture && currentTexture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL]) ?
                    egret.WebGLUtils.premultiplyTint(globalTintColor, alpha)
                    : globalTintColor + (alpha * 255 << 24));
                /*
                临时测试
                */
                //计算出绘制矩阵，之后把矩阵还原回之前的
                var locWorldTransform = bufferGlobalMatrix;
                var a = locWorldTransform.a;
                var b = locWorldTransform.b;
                var c = locWorldTransform.c;
                var d = locWorldTransform.d;
                var tx = locWorldTransform.tx;
                var ty = locWorldTransform.ty;
                var offsetX = bufferOffsetX;
                var offsetY = bufferOffsetY;
                if (offsetX != 0 || offsetY != 0) {
                    tx = offsetX * a + offsetY * c + tx;
                    ty = offsetX * b + offsetY * d + ty;
                }
                if (!meshVertices) {
                    if (destX != 0 || destY != 0) {
                        tx = destX * a + destY * c + tx;
                        ty = destX * b + destY * d + ty;
                    }
                    var a1 = destWidth / sourceWidth;
                    if (a1 != 1) {
                        a = a1 * a;
                        b = a1 * b;
                    }
                    var d1 = destHeight / sourceHeight;
                    if (d1 != 1) {
                        c = d1 * c;
                        d = d1 * d;
                    }
                }
                if (meshVertices) {
                    // 计算索引位置与赋值
                    var vertices = this.vertices;
                    var verticesUint32View = this._verticesUint32View;
                    var index = this.vertexIndex * this.vertSize;
                    // 缓存顶点数组
                    var i = 0, iD = 0, l = 0;
                    var u = 0, v = 0, x = 0, y = 0;
                    for (i = 0, l = meshUVs.length; i < l; i += 2) {
                        iD = index + i * 5 / 2;
                        x = meshVertices[i];
                        y = meshVertices[i + 1];
                        u = meshUVs[i];
                        v = meshUVs[i + 1];
                        // xy
                        vertices[iD + 0] = a * x + c * y + tx;
                        vertices[iD + 1] = b * x + d * y + ty;
                        // uv
                        if (rotated) {
                            vertices[iD + 2] = (sourceX + (1.0 - v) * sourceHeight) / textureSourceWidth;
                            vertices[iD + 3] = (sourceY + u * sourceWidth) / textureSourceHeight;
                        }
                        else {
                            vertices[iD + 2] = (sourceX + u * sourceWidth) / textureSourceWidth;
                            vertices[iD + 3] = (sourceY + v * sourceHeight) / textureSourceHeight;
                        }
                        // alpha
                        verticesUint32View[iD + 4] = alpha;
                    }
                    // 缓存索引数组
                    if (this.hasMesh) {
                        for (var i_3 = 0, l_2 = meshIndices.length; i_3 < l_2; ++i_3) {
                            this.indicesForMesh[this.indexIndex + i_3] = meshIndices[i_3] + this.vertexIndex;
                        }
                    }
                    this.vertexIndex += meshUVs.length / 2;
                    this.indexIndex += meshIndices.length;
                }
                else {
                    var width = textureSourceWidth;
                    var height = textureSourceHeight;
                    var w = sourceWidth;
                    var h = sourceHeight;
                    sourceX = sourceX / width;
                    sourceY = sourceY / height;
                    var vertices = this.vertices;
                    var verticesUint32View = this._verticesUint32View;
                    var index = this.vertexIndex * this.vertSize;
                    if (rotated) {
                        var temp = sourceWidth;
                        sourceWidth = sourceHeight / width;
                        sourceHeight = temp / height;
                        //--------------------------------------------
                        // xy
                        vertices[index++] = tx;
                        vertices[index++] = ty;
                        // uv
                        vertices[index++] = sourceWidth + sourceX;
                        vertices[index++] = sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        //--------------------------------------------
                        // xy
                        vertices[index++] = a * w + tx;
                        vertices[index++] = b * w + ty;
                        // uv
                        vertices[index++] = sourceWidth + sourceX;
                        vertices[index++] = sourceHeight + sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        //--------------------------------------------
                        // xy
                        vertices[index++] = a * w + c * h + tx;
                        vertices[index++] = d * h + b * w + ty;
                        // uv
                        vertices[index++] = sourceX;
                        vertices[index++] = sourceHeight + sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        //--------------------------------------------
                        // xy
                        vertices[index++] = c * h + tx;
                        vertices[index++] = d * h + ty;
                        // uv
                        vertices[index++] = sourceX;
                        vertices[index++] = sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                    }
                    else {
                        sourceWidth = sourceWidth / width;
                        sourceHeight = sourceHeight / height;
                        //--------------------------------------------
                        // xy
                        vertices[index++] = tx;
                        vertices[index++] = ty;
                        // uv
                        vertices[index++] = sourceX;
                        vertices[index++] = sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        //--------------------------------------------
                        // xy
                        vertices[index++] = a * w + tx;
                        vertices[index++] = b * w + ty;
                        // uv
                        vertices[index++] = sourceWidth + sourceX;
                        vertices[index++] = sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        //--------------------------------------------
                        // xy
                        vertices[index++] = a * w + c * h + tx;
                        vertices[index++] = d * h + b * w + ty;
                        // uv
                        vertices[index++] = sourceWidth + sourceX;
                        vertices[index++] = sourceHeight + sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                        //--------------------------------------------
                        // xy
                        vertices[index++] = c * h + tx;
                        vertices[index++] = d * h + ty;
                        // uv
                        vertices[index++] = sourceX;
                        vertices[index++] = sourceHeight + sourceY;
                        // alpha
                        verticesUint32View[index++] = alpha;
                    }
                    // 缓存索引数组
                    if (this.hasMesh) {
                        var indicesForMesh = this.indicesForMesh;
                        indicesForMesh[this.indexIndex + 0] = 0 + this.vertexIndex;
                        indicesForMesh[this.indexIndex + 1] = 1 + this.vertexIndex;
                        indicesForMesh[this.indexIndex + 2] = 2 + this.vertexIndex;
                        indicesForMesh[this.indexIndex + 3] = 0 + this.vertexIndex;
                        indicesForMesh[this.indexIndex + 4] = 2 + this.vertexIndex;
                        indicesForMesh[this.indexIndex + 5] = 3 + this.vertexIndex;
                    }
                    this.vertexIndex += 4;
                    this.indexIndex += 6;
                }
            };
            WebGLVertexArrayObject.prototype.clear = function () {
                this.hasMesh = false;
                this.vertexIndex = 0;
                this.indexIndex = 0;
            };
            return WebGLVertexArrayObject;
        }());
        web.WebGLVertexArrayObject = WebGLVertexArrayObject;
        __reflect(WebGLVertexArrayObject.prototype, "egret.web.WebGLVertexArrayObject");
        web.isIOS14Device = function () {
            return false;
        };
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var WebExternalInterface = /** @class */ (function () {
            function WebExternalInterface() {
            }
            /**
             * @private
             * @param functionName
             * @param value
             */
            WebExternalInterface.call = function (functionName, value) {
            };
            WebExternalInterface.callbackString = function (functionName, value) {
                return "";
            };
            /**
             * @private
             * @param functionName
             * @param listener
             */
            WebExternalInterface.addCallback = function (functionName, listener) {
            };
            return WebExternalInterface;
        }());
        web.WebExternalInterface = WebExternalInterface;
        __reflect(WebExternalInterface.prototype, "egret.web.WebExternalInterface", ["egret.ExternalInterface"]);
        var ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf("egretnative") < 0) {
            egret.ExternalInterface = WebExternalInterface;
        }
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
(function (egret) {
    var web;
    (function (web) {
        var callBackDic = {};
        /**
         * @private
         */
        var NativeExternalInterface = /** @class */ (function () {
            function NativeExternalInterface() {
            }
            NativeExternalInterface.call = function (functionName, value) {
                var data = {};
                data.functionName = functionName;
                data.value = value;
                egret_native.sendInfoToPlugin(JSON.stringify(data));
            };
            NativeExternalInterface.callbackString = function (functionName, value) {
                var data = {};
                data.functionName = functionName;
                data.value = value;
                egret_native.sendInfoToPlugin(JSON.stringify(data));
                return "";
            };
            NativeExternalInterface.addCallback = function (functionName, listener) {
                callBackDic[functionName] = listener;
            };
            return NativeExternalInterface;
        }());
        web.NativeExternalInterface = NativeExternalInterface;
        __reflect(NativeExternalInterface.prototype, "egret.web.NativeExternalInterface", ["egret.ExternalInterface"]);
        /**
         * @private
         * @param info
         */
        function onReceivedPluginInfo(info) {
            var data = JSON.parse(info);
            var functionName = data.functionName;
            var listener = callBackDic[functionName];
            if (listener) {
                var value = data.value;
                listener.call(null, value);
            }
            else {
                egret.$warn(1050, functionName);
            }
        }
        var ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf("egretnative") >= 0) {
            egret.ExternalInterface = NativeExternalInterface;
            egret_native.receivedPluginInfo = onReceivedPluginInfo;
        }
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
(function (egret) {
    var web;
    (function (web) {
        var callBackDic = {};
        /**
         * @private
         */
        var WebViewExternalInterface = /** @class */ (function () {
            function WebViewExternalInterface() {
            }
            WebViewExternalInterface.call = function (functionName, value) {
                __global.ExternalInterface.call(functionName, value);
            };
            WebViewExternalInterface.addCallback = function (functionName, listener) {
                callBackDic[functionName] = listener;
            };
            WebViewExternalInterface.callbackString = function (functionName, value) {
                return __global.ExternalInterface.callbackString(functionName, value);
            };
            WebViewExternalInterface.invokeCallback = function (functionName, value) {
                var listener = callBackDic[functionName];
                value = egret.Base64Util.decode_utf8(value);
                if (listener) {
                    listener.call(null, value);
                }
                else {
                    egret.$warn(1050, functionName);
                }
            };
            return WebViewExternalInterface;
        }());
        web.WebViewExternalInterface = WebViewExternalInterface;
        __reflect(WebViewExternalInterface.prototype, "egret.web.WebViewExternalInterface", ["egret.ExternalInterface"]);
        var ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf("egretwebview") >= 0) {
            egret.ExternalInterface = WebViewExternalInterface;
        }
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var localStorage;
    (function (localStorage) {
        var web;
        (function (web) {
            /**
             * @private
             *
             * @param key
             * @returns
             */
            function getItem(key) {
                return window.localStorage.getItem(key);
            }
            /**
             * @private
             *
             * @param key
             * @param value
             * @returns
             */
            function setItem(key, value) {
                try {
                    window.localStorage.setItem(key, value);
                    return true;
                }
                catch (e) {
                    egret.$warn(1047, key, value);
                    return false;
                }
            }
            /**
             * @private
             *
             * @param key
             */
            function removeItem(key) {
                window.localStorage.removeItem(key);
            }
            /**
             * @private
             *
             */
            function clear() {
                window.localStorage.clear();
            }
            localStorage.getItem = getItem;
            localStorage.setItem = setItem;
            localStorage.removeItem = removeItem;
            localStorage.clear = clear;
        })(web = localStorage.web || (localStorage.web = {}));
    })(localStorage = egret.localStorage || (egret.localStorage = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         * @inheritDoc
         */
        var HtmlSound = /** @class */ (function (_super) {
            __extends(HtmlSound, _super);
            /**
             * @private
             * @inheritDoc
             */
            function HtmlSound() {
                var _this = _super.call(this) || this;
                /**
                 * @private
                 */
                _this.loaded = false;
                return _this;
            }
            Object.defineProperty(HtmlSound.prototype, "length", {
                get: function () {
                    if (this.originAudio) {
                        return this.originAudio.duration;
                    }
                    throw new Error("sound not loaded!");
                    //return 0;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @inheritDoc
             */
            HtmlSound.prototype.load = function (url, useCache) {
                if (useCache === void 0) { useCache = true; }
                var self = this;
                this.url = url;
                if (true && !url) {
                    egret.$error(3002);
                }
                if (useCache && this.hasCache(url)) {
                    //如果有缓存，直接取缓存中的
                    self.loaded = true;
                    self.dispatchEventWith(egret.Event.COMPLETE);
                    return;
                }
                var audio = new Audio(url);
                audio.addEventListener("canplaythrough", onAudioLoaded);
                audio.addEventListener("error", onAudioError);
                var ua = navigator.userAgent.toLowerCase();
                if (ua.indexOf("firefox") >= 0) { //火狐兼容
                    audio.autoplay = !0;
                    audio.muted = true;
                }
                //edge and ie11
                var ie = ua.indexOf("edge") >= 0 || ua.indexOf("trident") >= 0;
                if (ie) {
                    document.body.appendChild(audio);
                }
                audio.load();
                HtmlSound.loadingSoundMap[url] = audio;
                this.originAudio = audio;
                if (HtmlSound.clearAudios[this.url]) {
                    delete HtmlSound.clearAudios[this.url];
                }
                function onAudioLoaded() {
                    delete HtmlSound.loadingSoundMap[url];
                    HtmlSound.$recycle(self.url, audio);
                    removeListeners();
                    if (ua.indexOf("firefox") >= 0) { //火狐兼容
                        audio.pause();
                        audio.muted = false;
                    }
                    if (ie) {
                        document.body.appendChild(audio);
                    }
                    self.loaded = true;
                    self.dispatchEventWith(egret.Event.COMPLETE);
                }
                function onAudioError() {
                    removeListeners();
                    self.dispatchEventWith(egret.IOErrorEvent.IO_ERROR);
                }
                function removeListeners() {
                    audio.removeEventListener("canplaythrough", onAudioLoaded);
                    audio.removeEventListener("error", onAudioError);
                    if (ie) {
                        document.body.removeChild(audio);
                    }
                }
            };
            HtmlSound.prototype.hasCache = function (url) {
                var r = HtmlSound.audios[url] ? HtmlSound.audios[url].length > 0 : false;
                return r;
            };
            /**
             * @inheritDoc
             */
            HtmlSound.prototype.play = function (startTime, loops, useStream) {
                startTime = +startTime || 0;
                loops = +loops || 0;
                if (true && this.loaded == false) {
                    egret.$error(1049);
                }
                var audio = HtmlSound.$pop(this.url);
                if (audio == null) {
                    audio = this.originAudio.cloneNode();
                }
                else {
                    //audio.load();
                }
                audio.autoplay = true;
                var channel = new web.HtmlSoundChannel(audio);
                channel.addEventListener(egret.Event.SOUND_COMPLETE, this.playSoundComplete, this);
                channel.$url = this.url;
                channel.$loops = loops;
                channel.$startTime = startTime;
                channel.$play();
                egret.sys.$pushSoundChannel(channel);
                return channel;
            };
            HtmlSound.prototype.playSoundComplete = function (evt) {
                var channel = evt.target;
                channel.removeEventListener(egret.Event.SOUND_COMPLETE, this.playSoundComplete, this);
                this.dispatchEventWith(egret.Event.ENDED);
            };
            /**
             * @inheritDoc
             */
            HtmlSound.prototype.close = function () {
                if (this.loaded && this.originAudio) {
                    this.originAudio.src = "";
                }
                if (this.originAudio)
                    this.originAudio = null;
                HtmlSound.$clear(this.url);
                this.loaded = false;
            };
            HtmlSound.$clear = function (url) {
                HtmlSound.clearAudios[url] = true;
                var array = HtmlSound.audios[url];
                if (array) {
                    array.length = 0;
                }
            };
            HtmlSound.$pop = function (url) {
                var array = HtmlSound.audios[url];
                if (array && array.length > 0) {
                    return array.pop();
                }
                return null;
            };
            HtmlSound.$recycle = function (url, audio) {
                if (HtmlSound.clearAudios[url]) {
                    return;
                }
                var array = HtmlSound.audios[url];
                if (HtmlSound.audios[url] == null) {
                    array = HtmlSound.audios[url] = [];
                }
                array.push(audio);
            };
            /**
             * Background music
             * @version Egret 2.4
             * @platform Web,Native
             * @language en_US
             */
            /**
             * 背景音乐
             * @version Egret 2.4
             * @platform Web,Native
             * @language zh_CN
             */
            HtmlSound.MUSIC = "music";
            /**
             * EFFECT
             * @version Egret 2.4
             * @platform Web,Native
             * @language en_US
             */
            /**
             * 音效
             * @version Egret 2.4
             * @platform Web,Native
             * @language zh_CN
             */
            HtmlSound.EFFECT = "effect";
            HtmlSound.loadingSoundMap = {};
            /**
             * @private
             */
            HtmlSound.audios = {};
            HtmlSound.clearAudios = {};
            return HtmlSound;
        }(egret.EventDispatcher));
        web.HtmlSound = HtmlSound;
        __reflect(HtmlSound.prototype, "egret.web.HtmlSound", ["egret.Sound"]);
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         * @inheritDoc
         */
        var HtmlSoundChannel = /** @class */ (function (_super) {
            __extends(HtmlSoundChannel, _super);
            /**
             * @private
             */
            function HtmlSoundChannel(audio) {
                var _this = _super.call(this) || this;
                /**
                 * @private
                 */
                _this.$startTime = 0;
                /**
                 * @private
                 */
                _this.audio = null;
                //声音是否已经播放完成
                _this.isStopped = false;
                //最近一次 audio.play() 返回的 Promise，用于把 pause/回收串行到其落定之后，
                //避免 pending 的 play() 被 pause 打断而抛 AbortError（play() interrupted）
                _this.$playPromise = null;
                _this.canPlay = function () {
                    _this.audio.removeEventListener("canplay", _this.canPlay);
                    try {
                        _this.audio.currentTime = _this.$startTime;
                    }
                    catch (e) {
                    }
                    finally {
                        _this.$playPromise = _this.audio.play();
                    }
                };
                /**
                 * @private
                 */
                _this.onPlayEnd = function () {
                    if (_this.$loops == 1) {
                        _this.stop();
                        _this.dispatchEventWith(egret.Event.SOUND_COMPLETE);
                        return;
                    }
                    if (_this.$loops > 0) {
                        _this.$loops--;
                    }
                    /////////////
                    //this.audio.load();
                    _this.$play();
                };
                /**
                 * @private
                 */
                _this._volume = 1;
                audio.addEventListener("ended", _this.onPlayEnd);
                _this.audio = audio;
                return _this;
            }
            HtmlSoundChannel.prototype.$play = function () {
                if (this.isStopped) {
                    egret.$error(1036);
                    return;
                }
                try {
                    //this.audio.pause();
                    this.audio.volume = this._volume;
                    this.audio.currentTime = this.$startTime;
                }
                catch (e) {
                    this.audio.addEventListener("canplay", this.canPlay);
                    return;
                }
                this.$playPromise = this.audio.play();
            };
            /**
             * @private
             * @inheritDoc
             */
            HtmlSoundChannel.prototype.stop = function () {
                if (!this.audio)
                    return;
                if (!this.isStopped) {
                    egret.sys.$popSoundChannel(this);
                }
                this.isStopped = true;
                var audio = this.audio;
                audio.removeEventListener("ended", this.onPlayEnd);
                audio.removeEventListener("canplay", this.canPlay);
                audio.volume = 0;
                this._volume = 0;
                this.audio = null;
                var url = this.$url;
                var playPromise = this.$playPromise;
                this.$playPromise = null;
                var finalize = function () {
                    audio.pause();
                    web.HtmlSound.$recycle(url, audio);
                };
                if (playPromise && typeof playPromise.then === "function") {
                    //串行到 play() 落定后再暂停+回收，避免打断 pending 的 play() 抛 AbortError
                    playPromise.then(finalize, finalize);
                }
                else {
                    //旧浏览器 play() 无 Promise：退回原有 200ms 延迟策略规避 chrome 报错
                    window.setTimeout(finalize, 200);
                }
            };
            HtmlSoundChannel.prototype.pause = function () {
                if (!this.audio) {
                    return;
                }
                if (this.isStopped) {
                    return;
                }
                var audio = this.audio;
                if (this.$playPromise && typeof this.$playPromise.then === "function") {
                    //串行到 play() 落定后再 pause，避免打断 pending 的 play()
                    this.$playPromise.then(function () { audio.pause(); }, function () { });
                }
                else {
                    audio.pause();
                }
            };
            HtmlSoundChannel.prototype.resume = function () {
                this.$play();
            };
            HtmlSoundChannel.prototype.isPaused = function () {
                if (this.audio) {
                    return this.audio.paused;
                }
                return false;
            };
            Object.defineProperty(HtmlSoundChannel.prototype, "volume", {
                /**
                 * @private
                 * @inheritDoc
                 */
                get: function () {
                    return this._volume;
                },
                /**
                 * @inheritDoc
                 */
                set: function (value) {
                    if (this.isStopped) {
                        egret.$error(1036);
                        return;
                    }
                    this._volume = value;
                    if (!this.audio)
                        return;
                    this.audio.volume = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(HtmlSoundChannel.prototype, "position", {
                /**
                 * @private
                 * @inheritDoc
                 */
                get: function () {
                    if (!this.audio)
                        return 0;
                    return this.audio.currentTime;
                },
                enumerable: true,
                configurable: true
            });
            return HtmlSoundChannel;
        }(egret.EventDispatcher));
        web.HtmlSoundChannel = HtmlSoundChannel;
        __reflect(HtmlSoundChannel.prototype, "egret.web.HtmlSoundChannel", ["egret.SoundChannel", "egret.IEventDispatcher"]);
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var WebAudioDecode = /** @class */ (function () {
            function WebAudioDecode() {
            }
            /**
             * @private
             *
             */
            WebAudioDecode.decodeAudios = function () {
                if (WebAudioDecode.decodeArr.length <= 0) {
                    return;
                }
                if (WebAudioDecode.isDecoding) {
                    return;
                }
                WebAudioDecode.isDecoding = true;
                var decodeInfo = WebAudioDecode.decodeArr.shift();
                WebAudioDecode.ctx.decodeAudioData(decodeInfo["buffer"], function (audioBuffer) {
                    decodeInfo["self"].audioBuffer = audioBuffer;
                    if (decodeInfo["success"]) {
                        decodeInfo["success"]();
                    }
                    WebAudioDecode.isDecoding = false;
                    WebAudioDecode.decodeAudios();
                }, function () {
                    egret.log('sound decode error');
                    if (decodeInfo["fail"]) {
                        decodeInfo["fail"]();
                    }
                    WebAudioDecode.isDecoding = false;
                    WebAudioDecode.decodeAudios();
                });
            };
            /**
             * @private
             */
            WebAudioDecode.decodeArr = [];
            /**
             * @private
             */
            WebAudioDecode.isDecoding = false;
            WebAudioDecode.scratchBuffer = null;
            return WebAudioDecode;
        }());
        web.WebAudioDecode = WebAudioDecode;
        __reflect(WebAudioDecode.prototype, "egret.web.WebAudioDecode");
        /**
         * @private
         * @inheritDoc
         */
        var WebAudioSound = /** @class */ (function (_super) {
            __extends(WebAudioSound, _super);
            /**
             * @private
             * @inheritDoc
             */
            function WebAudioSound() {
                var _this = _super.call(this) || this;
                /**
                 * @private
                 */
                _this.loaded = false;
                return _this;
            }
            Object.defineProperty(WebAudioSound.prototype, "length", {
                get: function () {
                    if (this.audioBuffer) {
                        return this.audioBuffer.duration;
                    }
                    throw new Error("sound not loaded!");
                    //return 0;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @inheritDoc
             */
            WebAudioSound.prototype.load = function (url) {
                var self = this;
                this.url = url;
                if (true && !url) {
                    egret.$error(3002);
                }
                var request = new XMLHttpRequest();
                request.open("GET", url, true);
                request.responseType = "arraybuffer";
                request.addEventListener("load", function () {
                    /*
                        desc: load（a)->load(b) 可能会因为缓存的原因导致b会先load，a后load，最终导致播放a而不是b
                        onload时检查当前应该播放的音乐是否为加载的音乐来避免该问题
                        add by chenhb 20230315
                    */
                    if (request.responseURL.lastIndexOf(self.url) < 0)
                        return;
                    var ioError = (request.status >= 400);
                    if (ioError) {
                        self.dispatchEventWith(egret.IOErrorEvent.IO_ERROR);
                    }
                    else {
                        WebAudioDecode.decodeArr.push({
                            "buffer": request.response,
                            "success": onAudioLoaded,
                            "fail": onAudioError,
                            "self": self,
                            "url": self.url
                        });
                        WebAudioDecode.decodeAudios();
                    }
                });
                request.addEventListener("error", function () {
                    self.dispatchEventWith(egret.IOErrorEvent.IO_ERROR);
                });
                request.send();
                function onAudioLoaded() {
                    self.loaded = true;
                    self.dispatchEventWith(egret.Event.COMPLETE);
                }
                function onAudioError() {
                    self.dispatchEventWith(egret.IOErrorEvent.IO_ERROR);
                }
            };
            /**
             * @inheritDoc
             */
            WebAudioSound.prototype.play = function (startTime, loops, useStream) {
                startTime = +startTime || 0;
                loops = +loops || 0;
                if (true && this.loaded == false) {
                    egret.$error(1049);
                }
                var channel = new web.WebAudioSoundChannel();
                channel.$url = this.url;
                channel.$loops = loops;
                channel.$audioBuffer = this.audioBuffer;
                channel.$startTime = startTime;
                channel.$play();
                egret.sys.$pushSoundChannel(channel);
                return channel;
            };
            /**
             * @inheritDoc
             */
            WebAudioSound.prototype.close = function () {
            };
            /**
             * Background music
             * @version Egret 2.4
             * @platform Web,Native
             * @language en_US
             */
            /**
             * 背景音乐
             * @version Egret 2.4
             * @platform Web,Native
             * @language zh_CN
             */
            WebAudioSound.MUSIC = "music";
            /**
             * EFFECT
             * @version Egret 2.4
             * @platform Web,Native
             * @language en_US
             */
            /**
             * 音效
             * @version Egret 2.4
             * @platform Web,Native
             * @language zh_CN
             */
            WebAudioSound.EFFECT = "effect";
            return WebAudioSound;
        }(egret.EventDispatcher));
        web.WebAudioSound = WebAudioSound;
        __reflect(WebAudioSound.prototype, "egret.web.WebAudioSound", ["egret.Sound"]);
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         * @inheritDoc
         */
        var WebAudioSoundChannel = /** @class */ (function (_super) {
            __extends(WebAudioSoundChannel, _super);
            /**
             * @private
             */
            function WebAudioSoundChannel() {
                var _this = _super.call(this) || this;
                /**
                 * @private
                 */
                _this.$startTime = 0;
                /**
                 * @private
                 */
                _this.bufferSource = null;
                /**
                 * @private
                 */
                _this.context = web.WebAudioDecode.ctx;
                //声音是否已经播放完成
                _this.isStopped = false;
                /**
                 * @private
                 */
                _this._currentTime = 0;
                /**
                 * @private
                 */
                _this._volume = 1;
                /**
                 * @private
                 */
                _this.onPlayEnd = function () {
                    if (_this.$loops == 1) {
                        _this.stop();
                        _this.dispatchEventWith(egret.Event.SOUND_COMPLETE);
                        return;
                    }
                    if (_this.$loops > 0) {
                        _this.$loops--;
                    }
                    /////////////
                    _this.$play();
                };
                /**
                 * @private
                 */
                _this._startTime = 0;
                _this.initGain();
                return _this;
            }
            WebAudioSoundChannel.prototype.initGain = function () {
                this.gain = null;
                if (this.context["createGain"]) {
                    this.gain = this.context["createGain"]();
                }
                else {
                    this.gain = this.context["createGainNode"]();
                }
            };
            WebAudioSoundChannel.prototype.$play = function () {
                if (this.isStopped) {
                    egret.$error(1036);
                    return;
                }
                if (this.bufferSource) {
                    this.bufferSource.onended = null;
                    this.bufferSource = null;
                }
                var context = this.context;
                var gain = this.gain;
                var bufferSource = context.createBufferSource();
                this.bufferSource = bufferSource;
                bufferSource.buffer = this.$audioBuffer;
                bufferSource.connect(gain);
                gain.connect(context.destination);
                bufferSource.onended = this.onPlayEnd;
                this._startTime = Date.now();
                this.gain.gain.value = this._volume;
                bufferSource.start(0, this.$startTime);
                this._currentTime = 0;
            };
            WebAudioSoundChannel.prototype.stop = function () {
                if (this.bufferSource) {
                    this.bufferSource;
                    if (this.bufferSource.stop) {
                        this.bufferSource.stop(0);
                    }
                    else {
                        this.bufferSource.noteOff(0);
                    }
                    this.bufferSource.onended = null;
                    this.bufferSource.disconnect();
                    try {
                        this.bufferSource.buffer = null;
                    }
                    catch (e) {
                        console.log("fail to set AudioBufferSourceNodeEgret.buffer null.", e);
                    }
                    this.bufferSource = null;
                    this.$audioBuffer = null;
                }
                if (!this.isStopped) {
                    egret.sys.$popSoundChannel(this);
                }
                this.isStopped = true;
            };
            WebAudioSoundChannel.prototype.pause = function () {
            };
            WebAudioSoundChannel.prototype.resume = function () {
            };
            WebAudioSoundChannel.prototype.isPaused = function () {
                return false;
            };
            Object.defineProperty(WebAudioSoundChannel.prototype, "volume", {
                /**
                 * @private
                 * @inheritDoc
                 */
                get: function () {
                    return this._volume;
                },
                /**
                 * @inheritDoc
                 */
                set: function (value) {
                    if (this.isStopped) {
                        egret.$error(1036);
                        return;
                    }
                    this._volume = value;
                    this.gain.gain.value = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(WebAudioSoundChannel.prototype, "position", {
                /**
                 * @private
                 * @inheritDoc
                 */
                get: function () {
                    if (this.bufferSource) {
                        return (Date.now() - this._startTime) / 1000 + this.$startTime;
                    }
                    return 0;
                },
                enumerable: true,
                configurable: true
            });
            return WebAudioSoundChannel;
        }(egret.EventDispatcher));
        web.WebAudioSoundChannel = WebAudioSoundChannel;
        __reflect(WebAudioSoundChannel.prototype, "egret.web.WebAudioSoundChannel", ["egret.SoundChannel", "egret.IEventDispatcher"]);
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         * @inheritDoc
         */
        var WebVideo = /** @class */ (function (_super) {
            __extends(WebVideo, _super);
            /**
             * @inheritDoc
             */
            function WebVideo(url, cache) {
                if (cache === void 0) { cache = true; }
                var _this = _super.call(this) || this;
                /**
                 * @private
                 */
                _this.loaded = false;
                /**
                 * @private
                 */
                _this.closed = false;
                /**
                 * @private
                 */
                _this.heightSet = NaN;
                /**
                 * @private
                 */
                _this.widthSet = NaN;
                /**
                 * @private
                 * pc上视频卡住的时候不能暂停
                 */
                _this.waiting = false;
                /**
                 * @private
                 * 用户是否设置了 pause
                 */
                _this.userPause = false;
                /**
                 * @private
                 * 用户是否设置了 play
                 */
                _this.userPlay = false;
                /**
                 * @private
                 * 最近一次 video.play() 返回的 Promise，用于把 pause 串行到其落定之后，
                 * 避免 pending 的 play() 被 pause 打断而抛 AbortError（play() interrupted）
                 */
                _this.$playPromise = null;
                _this.isPlayed = false;
                _this.screenChanged = function (e) {
                    var isfullscreen = document.fullscreenEnabled || document.webkitIsFullScreen;
                    if (!isfullscreen) {
                        _this.checkFullScreen(false);
                        // if (!egret.Capabilities.isMobile) {
                        _this._fullscreen = isfullscreen;
                        // }
                    }
                };
                _this._fullscreen = true;
                /**
                 * @private
                 *
                 */
                _this.onVideoLoaded = function () {
                    _this.video.removeEventListener("canplay", _this.onVideoLoaded);
                    var video = _this.video;
                    _this.loaded = true;
                    //video.pause();
                    if (_this.posterData) {
                        _this.posterData.width = _this.getPlayWidth();
                        _this.posterData.height = _this.getPlayHeight();
                    }
                    video.width = video.videoWidth;
                    video.height = video.videoHeight;
                    window.setTimeout(function () {
                        _this.dispatchEventWith(egret.Event.COMPLETE);
                    }, 200);
                };
                _this.$renderNode = new egret.sys.BitmapNode();
                _this.src = url;
                _this.once(egret.Event.ADDED_TO_STAGE, _this.loadPoster, _this);
                if (url) {
                    _this.load();
                }
                return _this;
            }
            WebVideo.prototype.createNativeDisplayObject = function () {
                this.$nativeDisplayObject = new egret_native.NativeDisplayObject(1 /* BITMAP */);
            };
            /**
             * @inheritDoc
             */
            WebVideo.prototype.load = function (url, cache) {
                var _this = this;
                if (cache === void 0) { cache = true; }
                url = url || this.src;
                this.src = url;
                if (true && !url) {
                    egret.$error(3002);
                }
                if (this.video && this.video.src == url) {
                    return;
                }
                var video;
                if (!this.video || egret.Capabilities.isMobile) {
                    video = document.createElement("video");
                    this.video = video;
                    video.controls = null;
                }
                else {
                    video = this.video;
                }
                if (url.indexOf("http://") != -1 || url.indexOf("HTTP://") != -1 || url.indexOf("https://") != -1 || url.indexOf("HTTPS://") != -1) {
                    video.crossOrigin = "anonymous";
                }
                video.src = url;
                video.setAttribute("autoplay", "autoplay");
                video.setAttribute("webkit-playsinline", "true");
                video.setAttribute("playsinline", "true");
                video.setAttribute("x5-video-player-type", "h5-page");
                video.addEventListener("canplay", this.onVideoLoaded);
                video.addEventListener("error", function () { return _this.onVideoError(); });
                video.addEventListener("ended", function () { return _this.onVideoEnded(); });
                var firstPause = false;
                video.addEventListener("canplay", function () {
                    _this.waiting = false;
                    if (!firstPause) {
                        firstPause = true;
                        _this.$safePauseVideo();
                    }
                    else {
                        if (_this.userPause) {
                            _this.pause();
                        }
                        else if (_this.userPlay) {
                            _this.play();
                        }
                    }
                });
                video.addEventListener("waiting", function () {
                    _this.waiting = true;
                });
                video.load();
                this.videoPlay();
                video.style.position = "absolute";
                video.style.top = "0px";
                video.style.zIndex = "-88888";
                video.style.left = "0px";
                video.height = 1;
                video.width = 1;
            };
            /**
             * @inheritDoc
             */
            WebVideo.prototype.play = function (startTime, loop) {
                var _this = this;
                if (loop === void 0) { loop = false; }
                if (this.loaded == false) {
                    this.load(this.src);
                    this.once(egret.Event.COMPLETE, function (e) { return _this.play(startTime, loop); }, this);
                    return;
                }
                this.isPlayed = true;
                var video = this.video;
                if (startTime != undefined) {
                    video.currentTime = +startTime || 0;
                }
                video.loop = !!loop;
                if (egret.Capabilities.isMobile) {
                    video.style.zIndex = "-88888"; //移动端，就算设置成最小，只要全屏，都会在最上层，而且在自动退出去后，不担心挡住canvas
                }
                else {
                    video.style.zIndex = "9999";
                }
                video.style.position = "absolute";
                video.style.top = "0px";
                video.style.left = "0px";
                video.height = video.videoHeight;
                video.width = video.videoWidth;
                if (egret.Capabilities.os != "Windows PC" && egret.Capabilities.os != "Mac OS") {
                    window.setTimeout(function () {
                        video.width = 0;
                    }, 1000);
                }
                this.checkFullScreen(this._fullscreen);
            };
            WebVideo.prototype.videoPlay = function () {
                this.userPause = false;
                if (this.waiting) {
                    this.userPlay = true;
                    return;
                }
                this.userPlay = false;
                this.$playPromise = this.video.play();
            };
            //统一暂停入口：串行到 play() 落定后再 video.pause()，从源头避免 play() interrupted
            WebVideo.prototype.$safePauseVideo = function () {
                var video = this.video;
                if (!video) {
                    return;
                }
                if (this.$playPromise && typeof this.$playPromise.then === "function") {
                    this.$playPromise.then(function () { video.pause(); }, function () { });
                }
                else {
                    video.pause();
                }
            };
            WebVideo.prototype.checkFullScreen = function (playFullScreen) {
                var video = this.video;
                if (playFullScreen) {
                    if (video.parentElement == null) {
                        video.removeAttribute("webkit-playsinline");
                        video.removeAttribute("playsinline");
                        document.body.appendChild(video);
                    }
                    egret.stopTick(this.markDirty, this);
                    this.goFullscreen();
                }
                else {
                    if (video.parentElement != null) {
                        video.parentElement.removeChild(video);
                    }
                    video.setAttribute("webkit-playsinline", "true");
                    video.setAttribute("playsinline", "true");
                    this.setFullScreenMonitor(false);
                    egret.startTick(this.markDirty, this);
                    // if (egret.Capabilities.isMobile) {
                    //     this.video.currentTime = 0;
                    //     this.onVideoEnded();
                    //     return;
                    // }
                }
                this.videoPlay();
            };
            WebVideo.prototype.goFullscreen = function () {
                var video = this.video;
                var fullscreenType;
                fullscreenType = egret.web.getPrefixStyleName('requestFullscreen', video);
                if (!video[fullscreenType]) {
                    fullscreenType = egret.web.getPrefixStyleName('requestFullScreen', video);
                    if (!video[fullscreenType]) {
                        return true;
                    }
                }
                video.removeAttribute("webkit-playsinline");
                video[fullscreenType]();
                this.setFullScreenMonitor(true);
                return true;
            };
            WebVideo.prototype.setFullScreenMonitor = function (use) {
                var video = this.video;
                if (use) {
                    video.addEventListener("mozfullscreenchange", this.screenChanged);
                    video.addEventListener("webkitfullscreenchange", this.screenChanged);
                    video.addEventListener("mozfullscreenerror", this.screenError);
                    video.addEventListener("webkitfullscreenerror", this.screenError);
                }
                else {
                    video.removeEventListener("mozfullscreenchange", this.screenChanged);
                    video.removeEventListener("webkitfullscreenchange", this.screenChanged);
                    video.removeEventListener("mozfullscreenerror", this.screenError);
                    video.removeEventListener("webkitfullscreenerror", this.screenError);
                }
            };
            WebVideo.prototype.screenError = function () {
                egret.$error(3014);
            };
            WebVideo.prototype.exitFullscreen = function () {
                //退出全屏
                if (document['exitFullscreen']) {
                    document['exitFullscreen']();
                }
                else if (document['msExitFullscreen']) {
                    document['msExitFullscreen']();
                }
                else if (document['mozCancelFullScreen']) {
                    document['mozCancelFullScreen']();
                }
                else if (document['oCancelFullScreen']) {
                    document['oCancelFullScreen']();
                }
                else if (document['webkitExitFullscreen']) {
                    document['webkitExitFullscreen']();
                }
                else {
                    this.video.style.display = "none";
                }
                if (this.video && this.video.parentElement) {
                    this.video.parentElement.removeChild(this.video);
                }
            };
            /**
             * @private
             *
             */
            WebVideo.prototype.onVideoEnded = function () {
                this.pause();
                this.isPlayed = false;
                if (this._fullscreen) {
                    this.exitFullscreen();
                }
                this.dispatchEventWith(egret.Event.ENDED);
            };
            /**
             * @private
             *
             */
            WebVideo.prototype.onVideoError = function () {
                console.error("video errorCode:", this.video.error.code);
                this.dispatchEventWith(egret.IOErrorEvent.IO_ERROR);
            };
            /**
             * @inheritDoc
             */
            WebVideo.prototype.close = function () {
                var _this = this;
                this.closed = true;
                this.video.removeEventListener("canplay", this.onVideoLoaded);
                this.video.removeEventListener("error", function () { return _this.onVideoError(); });
                this.video.removeEventListener("ended", function () { return _this.onVideoEnded(); });
                this.pause();
                if (this.loaded == false && this.video)
                    this.video.src = "";
                if (this.video && this.video.parentElement) {
                    this.video.parentElement.removeChild(this.video);
                    this.video = null;
                }
                this.loaded = false;
            };
            /**
             * @inheritDoc
             */
            WebVideo.prototype.pause = function () {
                this.userPlay = false;
                if (this.waiting) {
                    this.userPause = true;
                    return;
                }
                this.userPause = false;
                this.$safePauseVideo();
                egret.stopTick(this.markDirty, this);
            };
            Object.defineProperty(WebVideo.prototype, "volume", {
                /**
                 * @inheritDoc
                 */
                get: function () {
                    if (!this.video)
                        return 1;
                    return this.video.volume;
                },
                /**
                 * @inheritDoc
                 */
                set: function (value) {
                    if (!this.video)
                        return;
                    this.video.volume = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(WebVideo.prototype, "position", {
                /**
                 * @inheritDoc
                 */
                get: function () {
                    if (!this.video)
                        return 0;
                    return this.video.currentTime;
                },
                /**
                 * @inheritDoc
                 */
                set: function (value) {
                    if (!this.video)
                        return;
                    this.video.currentTime = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(WebVideo.prototype, "fullscreen", {
                /**
                 * @inheritDoc
                 */
                get: function () {
                    return this._fullscreen;
                },
                /**
                 * @inheritDoc
                 */
                set: function (value) {
                    // if (egret.Capabilities.isMobile) {
                    //     return;
                    // }
                    this._fullscreen = !!value;
                    if (this.video && this.video.paused == false) {
                        this.checkFullScreen(this._fullscreen);
                    }
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(WebVideo.prototype, "bitmapData", {
                /**
                 * @inheritDoc
                 */
                get: function () {
                    if (!this.video || !this.loaded)
                        return null;
                    if (!this._bitmapData) {
                        this.video.width = this.video.videoWidth;
                        this.video.height = this.video.videoHeight;
                        this._bitmapData = new egret.BitmapData(this.video);
                        this._bitmapData.$deleteSource = false;
                    }
                    return this._bitmapData;
                },
                enumerable: true,
                configurable: true
            });
            WebVideo.prototype.loadPoster = function () {
                var _this = this;
                var poster = this.poster;
                if (!poster)
                    return;
                var imageLoader = new egret.ImageLoader();
                imageLoader.once(egret.Event.COMPLETE, function (e) {
                    var posterData = imageLoader.data;
                    _this.posterData = imageLoader.data;
                    _this.$renderDirty = true;
                    _this.posterData.width = _this.getPlayWidth();
                    _this.posterData.height = _this.getPlayHeight();
                    if (egret.nativeRender) {
                        var texture = new egret.Texture();
                        texture._setBitmapData(_this.posterData);
                        _this.$nativeDisplayObject.setTexture(texture);
                    }
                }, this);
                imageLoader.load(poster);
            };
            /**
             * @private
             */
            WebVideo.prototype.$measureContentBounds = function (bounds) {
                var bitmapData = this.bitmapData;
                var posterData = this.posterData;
                if (bitmapData) {
                    bounds.setTo(0, 0, this.getPlayWidth(), this.getPlayHeight());
                }
                else if (posterData) {
                    bounds.setTo(0, 0, this.getPlayWidth(), this.getPlayHeight());
                }
                else {
                    bounds.setEmpty();
                }
            };
            WebVideo.prototype.getPlayWidth = function () {
                if (!isNaN(this.widthSet)) {
                    return this.widthSet;
                }
                if (this.bitmapData) {
                    return this.bitmapData.width;
                }
                if (this.posterData) {
                    return this.posterData.width;
                }
                return NaN;
            };
            WebVideo.prototype.getPlayHeight = function () {
                if (!isNaN(this.heightSet)) {
                    return this.heightSet;
                }
                if (this.bitmapData) {
                    return this.bitmapData.height;
                }
                if (this.posterData) {
                    return this.posterData.height;
                }
                return NaN;
            };
            /**
             * @private
             */
            WebVideo.prototype.$updateRenderNode = function () {
                var node = this.$renderNode;
                var bitmapData = this.bitmapData;
                var posterData = this.posterData;
                var width = this.getPlayWidth();
                var height = this.getPlayHeight();
                if ((!this.isPlayed || egret.Capabilities.isMobile) && posterData) {
                    node.image = posterData;
                    node.imageWidth = width;
                    node.imageHeight = height;
                    node.drawImage(0, 0, posterData.width, posterData.height, 0, 0, width, height);
                }
                else if (this.isPlayed && bitmapData) {
                    node.image = bitmapData;
                    node.imageWidth = bitmapData.width;
                    node.imageHeight = bitmapData.height;
                    egret.WebGLUtils.deleteWebGLTexture(bitmapData.webGLTexture);
                    bitmapData.webGLTexture = null;
                    node.drawImage(0, 0, bitmapData.width, bitmapData.height, 0, 0, width, height);
                }
            };
            WebVideo.prototype.markDirty = function () {
                this.$renderDirty = true;
                return true;
            };
            /**
             * @private
             * 设置显示高度
             */
            WebVideo.prototype.$setHeight = function (value) {
                this.heightSet = value;
                if (this.paused) { // 在暂停和播放结束后，修改视频大小时，没有重绘导致的bug
                    var self_1 = this;
                    this.$renderDirty = true;
                    window.setTimeout(function () {
                        self_1.$renderDirty = false;
                    }, 200);
                }
                _super.prototype.$setHeight.call(this, value);
            };
            /**
             * @private
             * 设置显示宽度
             */
            WebVideo.prototype.$setWidth = function (value) {
                this.widthSet = value;
                if (this.paused) { // 在暂停和播放结束后，修改视频大小时，没有重绘导致的bug
                    var self_2 = this;
                    this.$renderDirty = true;
                    window.setTimeout(function () {
                        self_2.$renderDirty = false;
                    }, 200);
                }
                _super.prototype.$setWidth.call(this, value);
            };
            Object.defineProperty(WebVideo.prototype, "paused", {
                get: function () {
                    if (this.video) {
                        return this.video.paused;
                    }
                    return true;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(WebVideo.prototype, "length", {
                /**
                 * @inheritDoc
                 */
                get: function () {
                    if (this.video) {
                        return this.video.duration;
                    }
                    throw new Error("Video not loaded!");
                },
                enumerable: true,
                configurable: true
            });
            return WebVideo;
        }(egret.DisplayObject));
        web.WebVideo = WebVideo;
        __reflect(WebVideo.prototype, "egret.web.WebVideo", ["egret.Video", "egret.DisplayObject"]);
        egret.Video = WebVideo;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var WebHttpRequest = /** @class */ (function (_super) {
            __extends(WebHttpRequest, _super);
            /**
             * @private
             */
            function WebHttpRequest() {
                var _this = _super.call(this) || this;
                /**
                 *
                 */
                _this.timeout = 0;
                /**
                 * @private
                 */
                _this._url = "";
                _this._method = "";
                return _this;
            }
            Object.defineProperty(WebHttpRequest.prototype, "response", {
                /**
                 * @private
                 * 本次请求返回的数据，数据类型根据responseType设置的值确定。
                 */
                get: function () {
                    if (!this._xhr) {
                        return null;
                    }
                    if (this._xhr.response != undefined) {
                        return this._xhr.response;
                    }
                    if (this._responseType == "text") {
                        return this._xhr.responseText;
                    }
                    if (this._responseType == "arraybuffer" && /msie 9.0/i.test(navigator.userAgent)) {
                        var w = window;
                        return w.convertResponseBodyToText(this._xhr["responseBody"]);
                    }
                    if (this._responseType == "document") {
                        return this._xhr.responseXML;
                    }
                    /*if (this._xhr.responseXML) {
                        return this._xhr.responseXML;
                    }
                    if (this._xhr.responseText != undefined) {
                        return this._xhr.responseText;
                    }*/
                    return null;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(WebHttpRequest.prototype, "responseType", {
                /**
                 * @private
                 * 设置返回的数据格式，请使用 HttpResponseType 里定义的枚举值。设置非法的值或不设置，都将使用HttpResponseType.TEXT。
                 */
                get: function () {
                    return this._responseType;
                },
                set: function (value) {
                    this._responseType = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(WebHttpRequest.prototype, "withCredentials", {
                /**
                 * @private
                 * 表明在进行跨站(cross-site)的访问控制(Access-Control)请求时，是否使用认证信息(例如cookie或授权的header)。 默认为 false。(这个标志不会影响同站的请求)
                 */
                get: function () {
                    return this._withCredentials;
                },
                set: function (value) {
                    this._withCredentials = value;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @private
             *
             * @returns
             */
            WebHttpRequest.prototype.getXHR = function () {
                if (window["XMLHttpRequest"]) {
                    // if (this._method.toLowerCase() == "get" && window["XyqHttpGetRequest"]) {
                    //     return new window["XyqHttpGetRequest"];
                    // }
                    return new window["XMLHttpRequest"]();
                }
                else {
                    return new ActiveXObject("MSXML2.XMLHTTP");
                }
            };
            /**
             * @private
             * 初始化一个请求.注意，若在已经发出请求的对象上调用此方法，相当于立即调用abort().
             * @param url 该请求所要访问的URL该请求所要访问的URL
             * @param method 请求所使用的HTTP方法， 请使用 HttpMethod 定义的枚举值.
             */
            WebHttpRequest.prototype.open = function (url, method) {
                if (method === void 0) { method = "GET"; }
                this._url = url;
                this._method = method;
                if (this._xhr) {
                    this._xhr.abort();
                    this._xhr = null;
                }
                var xhr = this.getXHR(); //new XMLHttpRequest();
                if (window["XMLHttpRequest"]) {
                    xhr.addEventListener("load", this.onload.bind(this));
                    xhr.addEventListener("error", this.onerror.bind(this));
                }
                else {
                    xhr.onreadystatechange = this.onReadyStateChange.bind(this);
                }
                xhr.onprogress = this.updateProgress.bind(this);
                xhr.ontimeout = this.onTimeout.bind(this);
                xhr.open(this._method, this._url, true);
                this._xhr = xhr;
            };
            /**
             * @private
             * 发送请求.
             * @param data 需要发送的数据
             */
            WebHttpRequest.prototype.send = function (data) {
                if (this._responseType != null) {
                    this._xhr.responseType = this._responseType;
                }
                if (this._withCredentials != null) {
                    this._xhr.withCredentials = this._withCredentials;
                }
                if (this.headerObj) {
                    for (var key in this.headerObj) {
                        this._xhr.setRequestHeader(key, this.headerObj[key]);
                    }
                }
                this._xhr.timeout = this.timeout;
                this._xhr.send(data);
            };
            /**
             * @private
             * 如果请求已经被发送,则立刻中止请求.
             */
            WebHttpRequest.prototype.abort = function () {
                if (this._xhr) {
                    this._xhr.abort();
                }
            };
            /**
             * @private
             * 返回所有响应头信息(响应头名和值), 如果响应头还没接受,则返回"".
             */
            WebHttpRequest.prototype.getAllResponseHeaders = function () {
                if (!this._xhr) {
                    return null;
                }
                var result = this._xhr.getAllResponseHeaders();
                return result ? result : "";
            };
            /**
             * @private
             * 给指定的HTTP请求头赋值.在这之前,您必须确认已经调用 open() 方法打开了一个url.
             * @param header 将要被赋值的请求头名称.
             * @param value 给指定的请求头赋的值.
             */
            WebHttpRequest.prototype.setRequestHeader = function (header, value) {
                if (!this.headerObj) {
                    this.headerObj = {};
                }
                this.headerObj[header] = value;
            };
            /**
             * @private
             * 返回指定的响应头的值, 如果响应头还没被接受,或该响应头不存在,则返回"".
             * @param header 要返回的响应头名称
             */
            WebHttpRequest.prototype.getResponseHeader = function (header) {
                if (!this._xhr) {
                    return null;
                }
                var result = this._xhr.getResponseHeader(header);
                return result ? result : "";
            };
            /**
             * @private
             */
            WebHttpRequest.prototype.onTimeout = function () {
                if (true) {
                    egret.$warn(1052, this._url);
                }
                this.dispatchEventWith(egret.IOErrorEvent.IO_ERROR, null, { reason: "onTimeout:" + this.timeout });
            };
            /**
             * @private
             */
            WebHttpRequest.prototype.onReadyStateChange = function () {
                var xhr = this._xhr;
                if (xhr.readyState == 4) { // 4 = "loaded"
                    var ioError_1 = (xhr.status >= 400);
                    var status_1 = xhr.status;
                    var url_1 = this._url;
                    var self_3 = this;
                    window.setTimeout(function () {
                        if (ioError_1) { //请求错误
                            if (true && !self_3.hasEventListener(egret.IOErrorEvent.IO_ERROR)) {
                                egret.$error(1011, url_1);
                            }
                            self_3.dispatchEventWith(egret.IOErrorEvent.IO_ERROR, null, { reason: "onReadyStateChange status error:" + status_1 });
                        }
                        else {
                            self_3.dispatchEventWith(egret.Event.COMPLETE);
                        }
                    }, 0);
                }
            };
            /**
             * @private
             */
            WebHttpRequest.prototype.updateProgress = function (event) {
                if (event.lengthComputable) {
                    egret.ProgressEvent.dispatchProgressEvent(this, egret.ProgressEvent.PROGRESS, event.loaded, event.total);
                }
            };
            /**
             * @private
             */
            WebHttpRequest.prototype.onload = function () {
                var self = this;
                var xhr = this._xhr;
                var url = this._url;
                var status = xhr.status;
                var ioError = (xhr.status >= 400);
                window.setTimeout(function () {
                    if (ioError) { //请求错误
                        if (true && !self.hasEventListener(egret.IOErrorEvent.IO_ERROR)) {
                            egret.$error(1011, url);
                        }
                        self.dispatchEventWith(egret.IOErrorEvent.IO_ERROR, null, { reason: "onload status error:" + status });
                    }
                    else {
                        self.dispatchEventWith(egret.Event.COMPLETE);
                    }
                }, 0);
            };
            /**
             * @private
             */
            WebHttpRequest.prototype.onerror = function () {
                var url = this._url;
                var self = this;
                var status = -1;
                if (this._xhr) {
                    status = this._xhr.status;
                }
                window.setTimeout(function () {
                    if (true && !self.hasEventListener(egret.IOErrorEvent.IO_ERROR)) {
                        egret.$error(1011, url);
                    }
                    self.dispatchEventWith(egret.IOErrorEvent.IO_ERROR, null, { reason: "onerror:" + status });
                }, 0);
            };
            return WebHttpRequest;
        }(egret.EventDispatcher));
        web.WebHttpRequest = WebHttpRequest;
        __reflect(WebHttpRequest.prototype, "egret.web.WebHttpRequest", ["egret.HttpRequest"]);
        egret.HttpRequest = WebHttpRequest;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        var winURL = window["URL"] || window["webkitURL"];
        /**
         * @private
         * ImageLoader 类可用于加载图像（JPG、PNG 或 GIF）文件。使用 load() 方法来启动加载。被加载的图像对象数据将存储在 ImageLoader.data 属性上 。
         */
        var WebImageLoader = /** @class */ (function (_super) {
            __extends(WebImageLoader, _super);
            function WebImageLoader() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                /**
                 * @private
                 * 使用 load() 方法加载成功的 BitmapData 图像数据。
                 */
                _this.data = null;
                /**
                 * @private
                 * 当从其他站点加载一个图片时，指定是否启用跨域资源共享(CORS)，默认值为null。
                 * 可以设置为"anonymous","use-credentials"或null,设置为其他值将等同于"anonymous"。
                 */
                _this._crossOrigin = null;
                /**
                 * @private
                 * 标记crossOrigin有没有被设置过,设置过之后使用设置的属性
                 */
                _this._hasCrossOriginSet = false;
                /**
                 * @private
                 */
                _this.currentImage = null;
                /**
                 * @private
                 */
                _this.request = null;
                return _this;
            }
            Object.defineProperty(WebImageLoader.prototype, "crossOrigin", {
                get: function () {
                    return this._crossOrigin;
                },
                set: function (value) {
                    this._hasCrossOriginSet = true;
                    this._crossOrigin = value;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @private
             * 启动一次图像加载。注意：若之前已经调用过加载请求，重新调用 load() 将终止先前的请求，并开始新的加载。
             * @param url 要加载的图像文件的地址。
             */
            WebImageLoader.prototype.load = function (url) {
                if (web.Html5Capatibility._canUseBlob
                    && url.indexOf("wxLocalResource:") != 0 //微信专用不能使用 blob
                    && url.indexOf("data:") != 0
                    && url.indexOf("http:") != 0
                    && url.indexOf("https:") != 0) { //如果是base64编码或跨域访问的图片，直接使用Image.src解析。
                    var request = this.request;
                    if (!request) {
                        request = this.request = new egret.web.WebHttpRequest();
                        request.addEventListener(egret.Event.COMPLETE, this.onBlobLoaded, this);
                        request.addEventListener(egret.IOErrorEvent.IO_ERROR, this.onBlobError, this);
                        request.responseType = "blob";
                    }
                    if (true) {
                        this.currentURL = url;
                    }
                    request.open(url);
                    request.send();
                }
                else {
                    this.loadImage(url);
                }
            };
            /**
             * @private
             */
            WebImageLoader.prototype.onBlobLoaded = function (event) {
                var blob = this.request.response;
                this.request = undefined;
                this.loadImage(winURL.createObjectURL(blob));
            };
            /**
             * @private
             */
            WebImageLoader.prototype.onBlobError = function (event) {
                this.dispatchIOError(this.currentURL);
                this.request = undefined;
            };
            /**
             * @private
             */
            WebImageLoader.prototype.loadImage = function (src) {
                var image = new Image();
                this.data = null;
                this.currentImage = image;
                if (this._hasCrossOriginSet) {
                    if (this._crossOrigin) {
                        image.crossOrigin = this._crossOrigin;
                    }
                }
                else {
                    if (WebImageLoader.crossOrigin) {
                        image.crossOrigin = WebImageLoader.crossOrigin;
                    }
                }
                /*else {
                    if (image.hasAttribute("crossOrigin")) {//兼容猎豹
                        image.removeAttribute("crossOrigin");
                    }
                }*/
                image.onload = this.onImageComplete.bind(this);
                image.onerror = this.onLoadError.bind(this);
                image.src = src;
            };
            /**
             * @private
             */
            WebImageLoader.prototype.onImageComplete = function (event) {
                var image = this.getImage(event);
                if (!image) {
                    return;
                }
                this.data = new egret.BitmapData(image);
                var self = this;
                window.setTimeout(function () {
                    self.dispatchEventWith(egret.Event.COMPLETE);
                }, 0);
            };
            /**
             * @private
             */
            WebImageLoader.prototype.onLoadError = function (event) {
                var image = this.getImage(event);
                if (!image) {
                    return;
                }
                this.dispatchIOError(image.src);
            };
            WebImageLoader.prototype.dispatchIOError = function (url) {
                var self = this;
                window.setTimeout(function () {
                    if (true && !self.hasEventListener(egret.IOErrorEvent.IO_ERROR)) {
                        egret.$error(1011, url);
                    }
                    self.dispatchEventWith(egret.IOErrorEvent.IO_ERROR);
                }, 0);
            };
            /**
             * @private
             */
            WebImageLoader.prototype.getImage = function (event) {
                var image = event.target;
                var url = image.src;
                if (url.indexOf("blob:") == 0) {
                    try {
                        winURL.revokeObjectURL(image.src);
                    }
                    catch (e) {
                        egret.$warn(1037);
                    }
                }
                image.onerror = null;
                image.onload = null;
                if (this.currentImage !== image) {
                    return null;
                }
                this.currentImage = null;
                return image;
            };
            /**
             * @private
             * 指定是否启用跨域资源共享,如果ImageLoader实例有设置过crossOrigin属性将使用设置的属性
             */
            WebImageLoader.crossOrigin = null;
            return WebImageLoader;
        }(egret.EventDispatcher));
        web.WebImageLoader = WebImageLoader;
        __reflect(WebImageLoader.prototype, "egret.web.WebImageLoader", ["egret.ImageLoader"]);
        egret.ImageLoader = WebImageLoader;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @classdesc
         * @extends egret.StageText
         * @private
         */
        var HTML5StageText = /** @class */ (function (_super) {
            __extends(HTML5StageText, _super);
            /**
             * @private
             */
            function HTML5StageText() {
                var _this = _super.call(this) || this;
                /**
                 * @private
                 */
                _this._isNeedShow = false;
                /**
                 * @private
                 */
                _this.inputElement = null;
                /**
                 * @private
                 */
                _this.inputDiv = null;
                /**
                 * @private
                 */
                _this._gscaleX = 0;
                /**
                 * @private
                 */
                _this._gscaleY = 0;
                /**
                 * @private
                 */
                _this.textValue = "";
                /**
                 * @private
                 */
                _this.colorValue = 0xffffff;
                /**
                 * @private
                 */
                _this._styleInfoes = {};
                return _this;
            }
            /**
             * @private
             *
             * @param textfield
             */
            HTML5StageText.prototype.$setTextField = function (textfield) {
                this.$textfield = textfield;
                return true;
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype.$addToStage = function () {
                this.htmlInput = egret.web.$getTextAdapter(this.$textfield);
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype._initElement = function () {
                var point = this.$textfield.localToGlobal(0, 0);
                var x = point.x;
                var y = point.y;
                // let m = this.$textfield.$renderNode.renderMatrix;
                // let cX = m.a;
                // let cY = m.d;
                var scaleX = this.htmlInput.$scaleX;
                var scaleY = this.htmlInput.$scaleY;
                if (this.htmlInput.native) {
                    this.inputElement.style.left = Math.round(x * scaleX);
                    this.inputElement.style.top = Math.round(y * scaleY);
                    this.inputElement.multiline = this.$textfield.multiline;
                }
                else {
                    this.inputDiv.style.left = x * scaleX + "px";
                    this.inputDiv.style.top = y * scaleY + "px";
                    if (this.$textfield.multiline && this.$textfield.height > this.$textfield.size) {
                        this.inputDiv.style.top = (y) * scaleY + "px";
                        this.inputElement.style.top = (-this.$textfield.lineSpacing / 2) * scaleY + "px";
                    }
                    else {
                        this.inputDiv.style.top = y * scaleY + "px";
                        this.inputElement.style.top = 0 + "px";
                    }
                }
                var node = this.$textfield;
                var cX = 1;
                var cY = 1;
                var rotation = 0;
                while (node.parent) {
                    cX *= node.scaleX;
                    cY *= node.scaleY;
                    rotation += node.rotation;
                    node = node.parent;
                }
                var transformKey = egret.web.getPrefixStyleName("transform");
                this.inputDiv.style[transformKey] = "rotate(" + rotation + "deg)";
                this._gscaleX = scaleX * cX;
                this._gscaleY = scaleY * cY;
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype.$show = function (active) {
                if (active === void 0) { active = true; }
                if (!this.htmlInput.isCurrentStageText(this)) {
                    this.inputElement = this.htmlInput.getInputElement(this);
                    if (!this.$textfield.multiline) {
                        if (this.inputElement.type == "password" && this.$textfield.inputType != "password") {
                            //解决安卓手机切换到安全键盘后无法切换回普通键盘的问题
                            this.htmlInput.initInputElement(false);
                            this.inputElement = this.htmlInput.getInputElement(this);
                        }
                        this.inputElement.type = this.$textfield.inputType;
                    }
                    else {
                        this.inputElement.type = "text";
                    }
                    this.inputDiv = this.htmlInput._inputDIV;
                }
                else {
                    this.inputElement.onblur = null;
                }
                this.htmlInput._needShow = true;
                //标记当前文本被选中
                this._isNeedShow = true;
                this._initElement();
                if (active) {
                    this.activeShowKeyboard();
                }
            };
            HTML5StageText.prototype.activeShowKeyboard = function () {
                if (this.htmlInput._needShow) {
                    // this.htmlInput._needShow = false;
                    this._isNeedShow = false;
                    this.dispatchEvent(new egret.Event("focus"));
                    this.executeShow();
                    this.htmlInput.show();
                }
                else {
                    this.htmlInput.blurInputElement();
                    this.htmlInput.disposeInputElement();
                }
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype.onBlurHandler = function () {
                this.htmlInput.clearInputElement();
                window.scrollTo(0, 0);
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype.onFocusHandler = function () {
                //the soft keyboard will cover the input box in some cases
                var self = this;
                window.setTimeout(function () {
                    if (self.inputElement) {
                        self.inputElement.scrollIntoView();
                    }
                }, 200);
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype.executeShow = function () {
                //打开
                if (this.inputElement.value !== this.$getText()) {
                    this.inputElement.value = this.$getText();
                }
                if (this.inputElement.onblur == null) {
                    this.inputElement.onblur = this.onBlurHandler.bind(this);
                }
                if (egret.Capabilities.isMobile && this.inputElement.onfocus == null) {
                    this.inputElement.onfocus = this.onFocusHandler.bind(this);
                }
                this.$resetStageText();
                if (this.$textfield.maxChars > 0) {
                    if (this.htmlInput.native)
                        this.inputElement.maxlength = this.$textfield.maxChars;
                    else
                        this.inputElement.setAttribute("maxlength", this.$textfield.maxChars);
                }
                else {
                    if (this.htmlInput.native)
                        this.inputElement.maxlength = 0;
                    else
                        this.inputElement.removeAttribute("maxlength");
                }
                this.inputElement.selectionStart = this.inputElement.value.length;
                this.inputElement.selectionEnd = this.inputElement.value.length;
                this.inputElement.focus();
            };
            /**
             * @private
             */
            HTML5StageText.prototype.$hide = function () {
                if (this.htmlInput) {
                    this.htmlInput.disconnectStageText(this);
                }
            };
            /**
             * @private
             *
             * @returns
             */
            HTML5StageText.prototype.$getText = function () {
                if (!this.textValue) {
                    this.textValue = "";
                }
                return this.textValue;
            };
            /**
             * @private
             *
             * @param value
             */
            HTML5StageText.prototype.$setText = function (value) {
                this.textValue = value;
                this.resetText();
                return true;
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype.resetText = function () {
                if (this.inputElement) {
                    this.inputElement.value = this.textValue;
                }
            };
            HTML5StageText.prototype.$setColor = function (value) {
                this.colorValue = value;
                this.resetColor();
                return true;
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype.resetColor = function () {
                if (this.inputElement) {
                    this.setElementStyle("color", this.htmlInput.native ? this.colorValue : egret.toColorString(this.colorValue));
                }
            };
            HTML5StageText.prototype.$onBlur = function () {
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype._onInput = function () {
                var self = this;
                window.setTimeout(function () {
                    if (self.inputElement && self.inputElement.selectionStart == self.inputElement.selectionEnd) {
                        self.textValue = self.inputElement.value;
                        egret.Event.dispatchEvent(self, "updateText", false);
                    }
                }, 0);
            };
            HTML5StageText.prototype._onInputDone = function () {
            };
            HTML5StageText.prototype._onInputSend = function () {
                var _this = this;
                egret.callLater(function () {
                    egret.Event.dispatchEvent(_this.$textfield, egret.Event.SEND_TEXT, false);
                }, this);
            };
            HTML5StageText.prototype.setAreaHeight = function () {
                var textfield = this.$textfield;
                if (textfield.multiline) {
                    var textheight = egret.TextFieldUtils.$getTextHeight(textfield);
                    if (textfield.height <= textfield.size) {
                        this.setElementStyle("height", (textfield.size) * this._gscaleY + "px");
                        this.setElementStyle("padding", "0px");
                        this.setElementStyle("lineHeight", (textfield.size) * this._gscaleY + "px");
                    }
                    else if (textfield.height < textheight) {
                        this.setElementStyle("height", (textfield.height) * this._gscaleY + "px");
                        this.setElementStyle("padding", "0px");
                        this.setElementStyle("lineHeight", (textfield.size + textfield.lineSpacing) * this._gscaleY + "px");
                    }
                    else {
                        this.setElementStyle("height", (textheight + textfield.lineSpacing) * this._gscaleY + "px");
                        var rap = (textfield.height - textheight) * this._gscaleY;
                        var valign = egret.TextFieldUtils.$getValign(textfield);
                        var top_1 = rap * valign;
                        var bottom = rap - top_1;
                        this.setElementStyle("padding", top_1 + "px 0px " + bottom + "px 0px");
                        this.setElementStyle("lineHeight", (textfield.size + textfield.lineSpacing) * this._gscaleY + "px");
                    }
                }
            };
            /**
             * @private
             *
             * @param e
             */
            HTML5StageText.prototype._onClickHandler = function (e) {
                if (this._isNeedShow) {
                    e.stopImmediatePropagation();
                    //e.preventDefault();
                    this._isNeedShow = false;
                    this.dispatchEvent(new egret.Event("focus"));
                    this.executeShow();
                }
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype._onDisconnect = function () {
                this.inputElement = null;
                this.dispatchEvent(new egret.Event("blur"));
            };
            /**
             * @private
             *
             * @param style
             * @param value
             */
            HTML5StageText.prototype.setElementStyle = function (style, value) {
                if (this.inputElement) {
                    if (this.htmlInput.native) {
                        if (style == "left" || style == "top" || style == "width" || style == "height" || style == "fontSize") {
                            this.inputElement.style[style] = Math.floor(Number(value.replace("px", "")));
                        }
                        else {
                            this.inputElement.style[style] = value;
                        }
                    }
                    else {
                        if (this._styleInfoes[style] != value) {
                            this.inputElement.style[style] = value;
                            //this._styleInfoes[style] = value;
                        }
                    }
                }
            };
            /**
             * @private
             *
             */
            HTML5StageText.prototype.$removeFromStage = function () {
                if (this.inputElement) {
                    this.htmlInput.disconnectStageText(this);
                }
            };
            /**
             * 修改位置
             * @private
             */
            HTML5StageText.prototype.$resetStageText = function () {
                if (this.inputElement) {
                    var textfield = this.$textfield;
                    this.setElementStyle("fontFamily", textfield.originFontFamily);
                    this.setElementStyle("fontStyle", textfield.italic ? "italic" : "normal");
                    this.setElementStyle("fontWeight", textfield.bold ? "bold" : "normal");
                    this.setElementStyle("textAlign", textfield.textAlign);
                    this.setElementStyle("fontSize", textfield.size * this._gscaleY + "px");
                    this.setElementStyle("color", this.htmlInput.native ? this.colorValue : egret.toColorString(textfield.textColor));
                    var tw = void 0;
                    if (textfield.stage) {
                        tw = textfield.localToGlobal(0, 0).x;
                        tw = Math.min(textfield.width, textfield.stage.stageWidth - tw);
                    }
                    else {
                        tw = textfield.width;
                    }
                    var inputWidth = tw * this._gscaleX;
                    var scale = (textfield.scaleX * egret.sys.DisplayList.$canvasScaleX) / (textfield.scaleY * egret.sys.DisplayList.$canvasScaleY);
                    this.setElementStyle("width", inputWidth / scale + "px");
                    this.setElementStyle("transform", "scale(" + scale + ",  1)");
                    this.setElementStyle("left", (scale - 1) * inputWidth / scale / 2 + "px");
                    this.setElementStyle("verticalAlign", textfield.verticalAlign);
                    if (textfield.multiline) {
                        this.setAreaHeight();
                    }
                    else {
                        this.setElementStyle("lineHeight", (textfield.size) * this._gscaleY + "px");
                        if (textfield.height < textfield.size) {
                            this.setElementStyle("height", (textfield.size) * this._gscaleY + "px");
                            var bottom = (textfield.size / 2) * this._gscaleY;
                            this.setElementStyle("padding", "0px 0px " + bottom + "px 0px");
                        }
                        else {
                            this.setElementStyle("height", (textfield.size) * this._gscaleY + "px");
                            var rap = (textfield.height - textfield.size) * this._gscaleY;
                            var valign = egret.TextFieldUtils.$getValign(textfield);
                            var top_2 = rap * valign;
                            var bottom = rap - top_2;
                            if (bottom < textfield.size / 2 * this._gscaleY) {
                                bottom = textfield.size / 2 * this._gscaleY;
                            }
                            this.setElementStyle("padding", top_2 + "px 0px " + bottom + "px 0px");
                        }
                    }
                    if (!this.htmlInput.native) {
                        this.inputDiv.style.clip = "rect(0px " + (textfield.width * this._gscaleX) + "px " + (textfield.height * this._gscaleY) + "px 0px)";
                        this.inputDiv.style.height = textfield.height * this._gscaleY + "px";
                        this.inputDiv.style.width = tw * this._gscaleX + "px";
                    }
                }
            };
            return HTML5StageText;
        }(egret.EventDispatcher));
        web.HTML5StageText = HTML5StageText;
        __reflect(HTML5StageText.prototype, "egret.web.HTML5StageText", ["egret.StageText"]);
        egret.StageText = HTML5StageText;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var HTMLInput = /** @class */ (function () {
            function HTMLInput() {
                var _this = this;
                /**
                 * @private
                 */
                this._needShow = false;
                /**
                 * @private
                 */
                this.$scaleX = 1;
                /**
                 * @private
                 */
                this.$scaleY = 1;
                this.stageTextClickHandler = function (e) {
                    if (_this._needShow) {
                        _this._needShow = false;
                        _this._stageText._onClickHandler(e);
                        _this.show();
                    }
                    else {
                        _this.blurInputElement();
                        _this.disposeInputElement();
                    }
                };
            }
            Object.defineProperty(HTMLInput.prototype, "nativeElement", {
                set: function (value) {
                    if (this._nativeElement === value)
                        return;
                    this._nativeElement = value;
                    this.initNativeInputElement();
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(HTMLInput.prototype, "native", {
                get: function () {
                    return this._inputElement == this._nativeElement;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @private
             *
             * @returns
             */
            HTMLInput.prototype.isInputOn = function () {
                return this._stageText != null;
            };
            /**
             * @private
             *
             * @param stageText
             * @returns
             */
            HTMLInput.prototype.isCurrentStageText = function (stageText) {
                return this._stageText == stageText;
            };
            /**
             * @private
             *
             * @param dom
             */
            HTMLInput.prototype.initValue = function (dom) {
                dom.style.position = "absolute";
                dom.style.left = "0px";
                dom.style.top = "0px";
                dom.style.border = "none";
                dom.style.padding = "0";
                dom.ontouchmove = function (e) {
                    e.preventDefault();
                };
            };
            /**
             * @private
             *
             */
            HTMLInput.prototype.$updateSize = function () {
                if (!this.canvas) {
                    return;
                }
                this.$scaleX = egret.sys.DisplayList.$canvasScaleX;
                this.$scaleY = egret.sys.DisplayList.$canvasScaleY;
                this.StageDelegateDiv.style.left = this.canvas.style.left;
                this.StageDelegateDiv.style.top = this.canvas.style.top;
                var transformKey = egret.web.getPrefixStyleName("transform");
                this.StageDelegateDiv.style[transformKey] = this.canvas.style[transformKey];
                this.StageDelegateDiv.style[egret.web.getPrefixStyleName("transformOrigin")] = "0% 0% 0px";
            };
            /**
             * @private
             *
             * @param container
             * @param canvas
             * @returns
             */
            HTMLInput.prototype._initStageDelegateDiv = function (container, canvas) {
                this.canvas = canvas;
                var self = this;
                var stageDelegateDiv;
                if (!stageDelegateDiv) {
                    stageDelegateDiv = document.createElement("div");
                    this.StageDelegateDiv = stageDelegateDiv;
                    stageDelegateDiv.id = "StageDelegateDiv";
                    container.appendChild(stageDelegateDiv);
                    self.initValue(stageDelegateDiv);
                    self._inputDIV = document.createElement("div");
                    self.initValue(self._inputDIV);
                    self._inputDIV.style.width = "0px";
                    self._inputDIV.style.height = "0px";
                    self._inputDIV.style.left = 0 + "px";
                    self._inputDIV.style.top = "-100px";
                    self._inputDIV.style[egret.web.getPrefixStyleName("transformOrigin")] = "0% 0% 0px";
                    stageDelegateDiv.appendChild(self._inputDIV);
                    // if (egret.Capabilities.isMobile) {
                    //     let downTime = 0;
                    //     let screenX: number, screenY: number;
                    //     this.canvas.addEventListener("touchstart", (e) => {
                    //         downTime = egret.getTimer();
                    //         for (let touch of e.touches) {
                    //             screenX = touch.screenX;
                    //             screenY = touch.screenY;
                    //         }
                    //     });
                    //     this.canvas.addEventListener("touchend", (e) => {
                    //         const upTime = egret.getTimer();
                    //         const timeDelay = upTime - downTime;
                    //         for (let touch of e.changedTouches) {
                    //             const offset = Math.sqrt(Math.pow(touch.screenX - screenX, 2) + Math.pow(touch.screenY - screenY, 2))
                    //             if (timeDelay < 300 && offset < 3) {
                    //                 this.stageTextClickHandler(e);
                    //             }
                    //         }
                    //         downTime = 0;
                    //         screenX = screenY = 0;
                    //     });
                    // } else {
                    this.canvas.addEventListener("click", this.stageTextClickHandler);
                    // }
                    self.initInputElement(true);
                    self.initInputElement(false);
                    self._nativeElement = null;
                }
            };
            //初始化输入框
            HTMLInput.prototype.initInputElement = function (multiline) {
                var self = this;
                //增加1个空的textarea
                var inputElement;
                if (multiline) {
                    inputElement = document.getElementById("egretTextarea");
                    if (inputElement && inputElement.parentNode) {
                        inputElement.parentNode.removeChild(inputElement);
                    }
                    inputElement = document.createElement("textarea");
                    inputElement.style["resize"] = "none";
                    self._multiElement = inputElement;
                    inputElement.id = "egretTextarea";
                }
                else {
                    inputElement = document.getElementById("egretTextarea");
                    if (inputElement && inputElement.parentNode) {
                        inputElement.parentNode.removeChild(inputElement);
                    }
                    inputElement = document.createElement("input");
                    self._simpleElement = inputElement;
                    inputElement.id = "egretInput";
                }
                // (inputElement as any).type = "text";
                self._inputDIV.appendChild(inputElement);
                inputElement.setAttribute("tabindex", "-1");
                inputElement.style.width = "1px";
                inputElement.style.height = "12px";
                self.initValue(inputElement);
                inputElement.style.outline = "thin";
                inputElement.style.background = "none";
                inputElement.style.overflow = "hidden";
                inputElement.style.wordBreak = "break-all";
                //隐藏输入框
                inputElement.style.opacity = "0";
                var inputLock = false;
                inputElement.oninput = function () {
                    if (self._stageText && !inputLock) {
                        self._stageText._onInput();
                    }
                };
                // 防止win10自带输入法多次触发oninput方法
                inputElement.addEventListener('compositionstart', function () {
                    inputLock = true;
                });
                inputElement.addEventListener('compositionend', function () {
                    inputLock = false;
                    if (self._stageText && !inputLock) {
                        self._stageText._onInput();
                    }
                });
            };
            HTMLInput.prototype.initNativeInputElement = function () {
                if (!this._nativeElement)
                    return;
                var self = this;
                this._nativeElement.oninput = function () {
                    if (self._stageText) {
                        self._stageText._onInput();
                    }
                };
                this._nativeElement.onkeydone = function () {
                    if (self._stageText) {
                        self._stageText._onInputDone();
                    }
                    if (self._inputElement) {
                        self._inputElement.blur();
                        self.clearInputElement();
                        self._inputElement = null;
                    }
                };
                this._nativeElement.onkeysend = function () {
                    if (self._stageText) {
                        self._stageText._onInputSend();
                    }
                    if (self._inputElement) {
                        self._inputElement.blur();
                        self.clearInputElement();
                        self._inputElement = null;
                    }
                };
            };
            /**
             * @private
             *
             */
            HTMLInput.prototype.show = function () {
                var self = this;
                var inputElement = self._inputElement;
                //隐藏输入框
                // egret.$callAsync(function () {
                inputElement.style.opacity = "1";
                // }, self);
            };
            /**
             * @private
             *
             * @param stageText
             */
            HTMLInput.prototype.disconnectStageText = function (stageText) {
                if (this._stageText == null || this._stageText == stageText) {
                    if (this._inputElement) {
                        this._inputElement.blur();
                    }
                    this.clearInputElement();
                    if (this._inputElement && !this._nativeElement && this._inputDIV.contains(this._inputElement)) {
                        this._inputDIV.removeChild(this._inputElement);
                    }
                    this._needShow = false;
                }
            };
            /**
             * @private
             *
             */
            HTMLInput.prototype.clearInputElement = function () {
                var self = this;
                if (self._inputElement) {
                    self._inputElement.value = "";
                    self._inputElement.onblur = null;
                    self._inputElement.onfocus = null;
                    self._inputElement.style.width = "1px";
                    self._inputElement.style.height = "12px";
                    self._inputElement.style.left = "0px";
                    self._inputElement.style.top = "0px";
                    self._inputElement.style.opacity = "0";
                    var otherElement = void 0;
                    if (self._simpleElement == self._inputElement) {
                        otherElement = self._multiElement;
                    }
                    else if (self._multiElement == self._inputElement) {
                        otherElement = self._simpleElement;
                    }
                    if (otherElement)
                        otherElement.style.display = "block";
                    self._inputDIV.style.left = 0 + "px";
                    self._inputDIV.style.top = "-100px";
                    self._inputDIV.style.height = 0 + "px";
                    self._inputDIV.style.width = 0 + "px";
                    self._inputElement.blur();
                }
                if (self._stageText) {
                    self._stageText._onDisconnect();
                    self._stageText = null;
                    this.canvas['userTyping'] = false;
                    if (this.finishUserTyping) {
                        this.finishUserTyping();
                    }
                }
            };
            /**
             * @private
             *
             * @param stageText
             * @returns
             */
            HTMLInput.prototype.getInputElement = function (stageText) {
                var self = this;
                self.clearInputElement();
                self._stageText = stageText;
                this.canvas['userTyping'] = true;
                if (self._stageText.$textfield.multiline) {
                    self._inputElement = self._multiElement;
                }
                else {
                    self._inputElement = self._simpleElement;
                }
                var otherElement;
                if (self._simpleElement == self._inputElement) {
                    otherElement = self._multiElement;
                }
                else if (self._multiElement == self._inputElement) {
                    otherElement = self._simpleElement;
                }
                if (otherElement)
                    otherElement.style.display = "none";
                self._inputElement = self._nativeElement ? self._nativeElement : self._inputElement;
                if (!self._nativeElement && self._inputElement && !self._inputDIV.contains(self._inputElement)) {
                    this._inputDIV.appendChild(this._inputElement);
                }
                return self._inputElement;
            };
            /**
             * @private
             */
            HTMLInput.prototype.blurInputElement = function () {
                if (this._inputElement) {
                    this.clearInputElement();
                    this._inputElement.blur();
                }
            };
            /**
             * @private
             */
            HTMLInput.prototype.disposeInputElement = function () {
                this._inputElement = null;
            };
            return HTMLInput;
        }());
        web.HTMLInput = HTMLInput;
        __reflect(HTMLInput.prototype, "egret.web.HTMLInput");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
(function (egret) {
    var web;
    (function (web) {
        var stageToTextLayerMap = {};
        var stageToCanvasMap = {};
        var stageToContainerMap = {};
        /**
         * @private
         * 获取
         */
        function $getTextAdapter(textfield) {
            var stageHash = textfield.stage ? textfield.stage.$hashCode : 0;
            var adapter = stageToTextLayerMap[stageHash];
            var canvas = stageToCanvasMap[stageHash];
            var container = stageToContainerMap[stageHash];
            if (canvas && container) {
                //adapter._initStageDelegateDiv(container, canvas);
                //adapter.$updateSize();
                delete stageToCanvasMap[stageHash];
                delete stageToContainerMap[stageHash];
            }
            return adapter;
        }
        web.$getTextAdapter = $getTextAdapter;
        /**
         * @private
         */
        function $cacheTextAdapter(adapter, stage, container, canvas) {
            adapter._initStageDelegateDiv(container, canvas);
            stageToTextLayerMap[stage.$hashCode] = adapter;
            stageToCanvasMap[stage.$hashCode] = canvas;
            stageToContainerMap[stage.$hashCode] = container;
            stage.textAdapter = adapter;
        }
        web.$cacheTextAdapter = $cacheTextAdapter;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var context = null;
        /**
         * @private
         */
        var fontCache = {};
        var offScreencanvas;
        var offScreencanvasCtx = null;
        /**
         * 测量文本在指定样式下的宽度。
         * @param text 要测量的文本内容。
         * @param fontFamily 字体名称
         * @param fontSize 字体大小
         * @param bold 是否粗体
         * @param italic 是否斜体
         */
        function measureText(text, fontFamily, fontSize, bold, italic, cacheType) {
            if (cacheType === void 0) { cacheType = "default"; }
            if (!context) {
                createContext();
            }
            // canvasHitTestBuffer 未就绪时 context 仍为 null，安全降级避免崩溃
            if (!context) {
                return 0;
            }
            var font = "";
            if (italic)
                font += "italic ";
            if (bold)
                font += "bold ";
            font += ((typeof fontSize == "number" && fontSize >= 0) ? fontSize : 12) + "px ";
            font += ((typeof fontFamily == "string" && fontFamily != "") ? fontFamily : "Arial");
            context.font = font;
            return egret.sys.measureTextWith(context, text, cacheType);
        }
        function measureAtlasText(text, fontFamily, fontSize, bold, italic) {
            if (!context) {
                createContext();
            }
            // canvasHitTestBuffer 未就绪时 context 仍为 null，安全降级避免崩溃
            if (!context) {
                return { width: 0 };
            }
            var font = "";
            if (italic)
                font += "italic ";
            if (bold)
                font += "bold ";
            font += ((typeof fontSize == "number" && fontSize >= 0) ? fontSize : 12) + "px ";
            font += ((typeof fontFamily == "string" && fontFamily != "") ? fontFamily : "Arial");
            context.font = font;
            return context.measureText(text);
        }
        /**
         * @private
         */
        function createContext() {
            var useOffScreenCanvas = false;
            if (egret.Capabilities.runtimeType != egret.RuntimeType.WXGAME) {
                try {
                    offScreencanvas = new OffscreenCanvas(0, 0);
                    offScreencanvasCtx = offScreencanvas.getContext("2d");
                    useOffScreenCanvas = true;
                }
                catch (error) {
                }
            }
            if (useOffScreenCanvas) {
                context = offScreencanvasCtx;
            }
            else {
                // canvasHitTestBuffer 可能在 Player 未初始化完成时为 null
                if (!egret.sys.canvasHitTestBuffer) {
                    return;
                }
                context = egret.sys.canvasHitTestBuffer.context;
            }
            console.log("offScreencanvas use = " + useOffScreenCanvas);
            if (!context) {
                return;
            }
            context.textAlign = "left";
            context.textBaseline = "bottom";
        }
        egret.sys.measureText = measureText;
        egret.sys.measureAtlasText = measureAtlasText;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * 创建一个canvas。
         */
        function __createCanvas__(width, height) {
            var canvas = egret.sys.createCanvas(width, height);
            var context = canvas.getContext("2d");
            if (context["imageSmoothingEnabled"] === undefined) {
                var keys = ["webkitImageSmoothingEnabled", "mozImageSmoothingEnabled", "msImageSmoothingEnabled"];
                var key_1;
                for (var i = keys.length - 1; i >= 0; i--) {
                    key_1 = keys[i];
                    if (context[key_1] !== void 0) {
                        break;
                    }
                }
                try {
                    Object.defineProperty(context, "imageSmoothingEnabled", {
                        get: function () {
                            return this[key_1];
                        },
                        set: function (value) {
                            this[key_1] = value;
                        }
                    });
                }
                catch (e) {
                    context["imageSmoothingEnabled"] = context[key_1];
                }
            }
            return canvas;
        }
        var sharedCanvas;
        /**
         * @private
         * Canvas2D渲染缓冲
         */
        var CanvasRenderBuffer = /** @class */ (function () {
            function CanvasRenderBuffer(width, height, root) {
                this.surface = egret.sys.createCanvasRenderBufferSurface(__createCanvas__, width, height, root);
                this.context = this.surface.getContext("2d");
                if (this.context) {
                    this.context.$offsetX = 0;
                    this.context.$offsetY = 0;
                }
                this.resize(width, height);
            }
            Object.defineProperty(CanvasRenderBuffer.prototype, "width", {
                /**
                 * 渲染缓冲的宽度，以像素为单位。
                 * @readOnly
                 */
                get: function () {
                    return this.surface.width;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CanvasRenderBuffer.prototype, "height", {
                /**
                 * 渲染缓冲的高度，以像素为单位。
                 * @readOnly
                 */
                get: function () {
                    return this.surface.height;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * 改变渲染缓冲的大小并清空缓冲区
             * @param width 改变后的宽
             * @param height 改变后的高
             * @param useMaxSize 若传入true，则将改变后的尺寸与已有尺寸对比，保留较大的尺寸。
             */
            CanvasRenderBuffer.prototype.resize = function (width, height, useMaxSize) {
                egret.sys.resizeCanvasRenderBuffer(this, width, height, useMaxSize);
            };
            /**
             * 获取指定区域的像素
             */
            CanvasRenderBuffer.prototype.getPixels = function (x, y, width, height) {
                if (width === void 0) { width = 1; }
                if (height === void 0) { height = 1; }
                return this.context.getImageData(x, y, width, height).data;
            };
            /**
             * 转换成base64字符串，如果图片（或者包含的图片）跨域，则返回null
             * @param type 转换的类型，如: "image/png","image/jpeg"
             */
            CanvasRenderBuffer.prototype.toDataURL = function (type, encoderOptions) {
                return this.surface.toDataURL(type, encoderOptions);
            };
            /**
             * 清空缓冲区数据
             */
            CanvasRenderBuffer.prototype.clear = function () {
                this.context.setTransform(1, 0, 0, 1, 0, 0);
                this.context.clearRect(0, 0, this.surface.width, this.surface.height);
            };
            /**
             * 销毁绘制对象
             */
            CanvasRenderBuffer.prototype.destroy = function () {
                this.surface.width = this.surface.height = 0;
            };
            return CanvasRenderBuffer;
        }());
        web.CanvasRenderBuffer = CanvasRenderBuffer;
        __reflect(CanvasRenderBuffer.prototype, "egret.web.CanvasRenderBuffer", ["egret.sys.RenderBuffer"]);
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided this the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var WebTouchHandler = /** @class */ (function (_super) {
            __extends(WebTouchHandler, _super);
            /**
             * @private
             */
            function WebTouchHandler(stage, canvas) {
                var _this = _super.call(this) || this;
                _this.mouseDownCanvas = function (event) {
                    egret.TouchEvent.dispatchEvent(_this.touch.stage, egret.TouchEvent.TOUCH_CANVAS);
                };
                _this.touchCanvas = function (event) {
                    egret.TouchEvent.dispatchEvent(_this.touch.stage, egret.TouchEvent.TOUCH_CANVAS);
                };
                /**
                 * @private
                 */
                _this.onTouchBegin = function (event) {
                    var location = _this.getLocation(event);
                    _this.touch.onTouchBegin(location.x, location.y, event.identifier);
                };
                _this.onMouseMove = function (event) {
                    if (event.buttons == 0) { //在外面松开按键
                        _this.onTouchEnd(event);
                    }
                    else {
                        _this.onTouchMove(event);
                    }
                    var location = _this.getLocation(event);
                    _this.touch.onMouseMove(location.x, location.y);
                };
                /**
                 * @private
                 */
                _this.onMouseLeave = function (event) {
                    var location = _this.getLocation(event);
                    _this.touch.onMouseLeave(location.x, location.y, event.identifier);
                };
                /**
                 * @private
                 */
                _this.onMouseEnter = function (event) {
                    var location = _this.getLocation(event);
                    _this.touch.onMouseEnter(location.x, location.y, event.identifier);
                };
                /**
                 * @private
                 */
                _this.onTouchMove = function (event) {
                    var location = _this.getLocation(event);
                    _this.touch.onTouchMove(location.x, location.y, event.identifier);
                };
                /**
                 * @private
                 */
                _this.onTouchEnd = function (event) {
                    var location = _this.getLocation(event);
                    _this.touch.onTouchEnd(location.x, location.y, event.identifier);
                };
                /**
                 * @private
                 */
                _this.scaleX = 1;
                /**
                 * @private
                 */
                _this.scaleY = 1;
                /**
                 * @private
                 */
                _this.rotation = 0;
                _this.canvas = canvas;
                _this.touch = new egret.sys.TouchHandler(stage);
                _this.addListeners();
                return _this;
            }
            /**
             * @private
             * 添加事件监听
             */
            WebTouchHandler.prototype.addListeners = function () {
                var _this = this;
                if (window.navigator.msPointerEnabled) {
                    this.canvas.addEventListener("MSPointerDown", function (event) {
                        event.identifier = event.pointerId;
                        _this.onTouchBegin(event);
                        _this.prevent(event);
                    }, false);
                    this.canvas.addEventListener("MSPointerMove", function (event) {
                        event.identifier = event.pointerId;
                        _this.onTouchMove(event);
                        _this.prevent(event);
                    }, false);
                    this.canvas.addEventListener("MSPointerUp", function (event) {
                        event.identifier = event.pointerId;
                        _this.onTouchEnd(event);
                        _this.prevent(event);
                    }, false);
                }
                else {
                    if (!egret.Capabilities.isMobile) {
                        this.addMouseListener();
                    }
                    this.addTouchListener();
                }
            };
            /**
             * @private
             *
             */
            WebTouchHandler.prototype.addMouseListener = function () {
                this.canvas.addEventListener("mousedown", this.mouseDownCanvas);
                this.canvas.addEventListener("mousedown", this.onTouchBegin);
                this.canvas.addEventListener("mousemove", this.onMouseMove);
                this.canvas.addEventListener("mouseup", this.onTouchEnd);
                this.canvas.addEventListener("mouseleave", this.onMouseLeave);
                this.canvas.addEventListener("mouseenter", this.onMouseEnter);
            };
            /**
             * @private
             *
             */
            WebTouchHandler.prototype.addTouchListener = function () {
                var _this = this;
                this.canvas.addEventListener("touchstart", this.touchCanvas);
                this.canvas.addEventListener("touchstart", function (event) {
                    var l = event.changedTouches.length;
                    for (var i = 0; i < l; i++) {
                        _this.onTouchBegin(event.changedTouches[i]);
                    }
                    _this.prevent(event);
                }, false);
                this.canvas.addEventListener("touchmove", function (event) {
                    var l = event.changedTouches.length;
                    for (var i = 0; i < l; i++) {
                        _this.onTouchMove(event.changedTouches[i]);
                    }
                    _this.prevent(event);
                }, false);
                this.canvas.addEventListener("touchend", function (event) {
                    var l = event.changedTouches.length;
                    for (var i = 0; i < l; i++) {
                        _this.onTouchEnd(event.changedTouches[i]);
                    }
                    _this.prevent(event);
                }, false);
                this.canvas.addEventListener("touchcancel", function (event) {
                    var l = event.changedTouches.length;
                    for (var i = 0; i < l; i++) {
                        _this.onTouchEnd(event.changedTouches[i]);
                    }
                    _this.prevent(event);
                }, false);
            };
            /**
             * @private
             */
            WebTouchHandler.prototype.prevent = function (event) {
                event.stopPropagation();
                if (event["isScroll"] != true && !this.canvas['userTyping']) {
                    event.preventDefault();
                }
            };
            /**
             * @private
             */
            WebTouchHandler.prototype.getLocation = function (event) {
                event.identifier = +event.identifier || 0;
                var doc = document.documentElement;
                var box = this.canvas.getBoundingClientRect();
                var left = box.left + window.pageXOffset - doc.clientLeft;
                var top = box.top + window.pageYOffset - doc.clientTop;
                var x = event.pageX - left, newx = x;
                var y = event.pageY - top, newy = y;
                if (this.rotation == 90) {
                    newx = y;
                    newy = box.width - x;
                }
                else if (this.rotation == -90) {
                    newx = box.height - y;
                    newy = x;
                }
                newx = newx / this.scaleX;
                newy = newy / this.scaleY;
                return egret.$TempPoint.setTo(Math.round(newx), Math.round(newy));
            };
            /**
             * @private
             * 更新屏幕当前的缩放比例，用于计算准确的点击位置。
             * @param scaleX 水平方向的缩放比例。
             * @param scaleY 垂直方向的缩放比例。
             */
            WebTouchHandler.prototype.updateScaleMode = function (scaleX, scaleY, rotation) {
                this.scaleX = scaleX;
                this.scaleY = scaleY;
                this.rotation = rotation;
            };
            /**
             * @private
             * 更新同时触摸点的数量
             */
            WebTouchHandler.prototype.$updateMaxTouches = function () {
                this.touch.$initMaxTouches();
            };
            return WebTouchHandler;
        }(egret.HashObject));
        web.WebTouchHandler = WebTouchHandler;
        __reflect(WebTouchHandler.prototype, "egret.web.WebTouchHandler");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        web.WebLifeCycleHandler = function (context) {
            var resume = function () {
                context.resume();
                /** 解决 ios13 页面切到后台再拉起，声音无法播放 */
                // 白鹭修改有bug,会导致正在播放的声音丢失
                //if (Html5Capatibility._audioType == AudioType.WEB_AUDIO && WebAudioDecode.initAudioContext) {
                //     WebAudioDecode.initAudioContext();
                // }
            };
            var pause = function () {
                context.pause();
            };
            context["isWebLifeCycleHandler"] = true;
            var handleVisibilityChange = function () {
                if (!document[hidden]) {
                    resume();
                }
                else {
                    pause();
                }
                console.log(">>>>>>> handleVisiblityChange isHidden:" + document[hidden]);
                egret.lifecycle.isHidden = document[hidden];
                window["tickWorker"] && window["tickWorker"].postMessage(document[hidden]);
            };
            window.addEventListener("focus", resume, false);
            window.addEventListener("blur", pause, false);
            var hidden, visibilityChange;
            if (typeof document.hidden !== "undefined") {
                hidden = "hidden";
                visibilityChange = "visibilitychange";
            }
            else if (typeof document["mozHidden"] !== "undefined") {
                hidden = "mozHidden";
                visibilityChange = "mozvisibilitychange";
            }
            else if (typeof document["msHidden"] !== "undefined") {
                hidden = "msHidden";
                visibilityChange = "msvisibilitychange";
            }
            else if (typeof document["webkitHidden"] !== "undefined") {
                hidden = "webkitHidden";
                visibilityChange = "webkitvisibilitychange";
            }
            else if (typeof document["oHidden"] !== "undefined") {
                hidden = "oHidden";
                visibilityChange = "ovisibilitychange";
            }
            if ("onpageshow" in window && "onpagehide" in window) {
                window.addEventListener("pageshow", resume, false);
                window.addEventListener("pagehide", pause, false);
            }
            if (hidden && visibilityChange && !egret.Capabilities["isInApp"]) {
                document.addEventListener(visibilityChange, handleVisibilityChange, false);
            }
            var ua = navigator.userAgent;
            var isWX = /micromessenger/gi.test(ua);
            var isQQBrowser = /mqq/ig.test(ua);
            var isQQ = /mobile.*qq/gi.test(ua);
            if (isQQ || isWX) {
                isQQBrowser = false;
            }
            if (isQQBrowser) {
                var browser = window["browser"] || {};
                browser.execWebFn = browser.execWebFn || {};
                browser.execWebFn.postX5GamePlayerMessage = function (event) {
                    var eventType = event.type;
                    if (eventType == "app_enter_background") {
                        pause();
                    }
                    else if (eventType == "app_enter_foreground") {
                        resume();
                    }
                };
                window["browser"] = browser;
            }
        };
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var AudioType = /** @class */ (function () {
            function AudioType() {
            }
            /**
             * @private
             */
            AudioType.WEB_AUDIO = 2;
            /**
             * @private
             */
            AudioType.HTML5_AUDIO = 3;
            return AudioType;
        }());
        web.AudioType = AudioType;
        __reflect(AudioType.prototype, "egret.web.AudioType");
        /**
         * html5兼容性配置
         * @private
         */
        var Html5Capatibility = /** @class */ (function (_super) {
            __extends(Html5Capatibility, _super);
            /**
             * @private
             */
            function Html5Capatibility() {
                return _super.call(this) || this;
            }
            /**
             * @private
             *
             */
            Html5Capatibility.$init = function () {
                var ua = navigator.userAgent.toLowerCase();
                Html5Capatibility.ua = ua;
                Html5Capatibility._canUseBlob = false;
                var canUseWebAudio = window["AudioContext"] || window["webkitAudioContext"] || window["mozAudioContext"];
                var isIos = ua.indexOf("iphone") >= 0 || ua.indexOf("ipad") >= 0 || ua.indexOf("ipod") >= 0;
                if (canUseWebAudio) {
                    try {
                        //防止某些chrome版本创建异常问题
                        web.WebAudioDecode.initAudioContext = function () {
                            if (web.WebAudioDecode.ctx) {
                                try {
                                    web.WebAudioDecode.ctx.close();
                                }
                                catch (e) {
                                }
                            }
                            web.WebAudioDecode.ctx = new (window["AudioContext"] || window["webkitAudioContext"] || window["mozAudioContext"])();
                            web.WebAudioDecode.scratchBuffer = web.WebAudioDecode.ctx.createBuffer(1, 1, 22050);
                            var useingChannel = egret.sys.usingChannel;
                            for (var _i = 0, useingChannel_1 = useingChannel; _i < useingChannel_1.length; _i++) {
                                var channel = useingChannel_1[_i];
                                var webSoundChannel = channel;
                                webSoundChannel.context = web.WebAudioDecode.ctx;
                                webSoundChannel.initGain();
                                webSoundChannel.$startTime = webSoundChannel.position;
                                webSoundChannel.$play();
                            }
                        };
                        web.WebAudioDecode.initAudioContext();
                    }
                    catch (e) {
                        canUseWebAudio = false;
                    }
                }
                var audioType = Html5Capatibility._audioType;
                var checkAudioType;
                if ((audioType == AudioType.WEB_AUDIO && canUseWebAudio) || audioType == AudioType.HTML5_AUDIO) {
                    checkAudioType = false;
                    Html5Capatibility.setAudioType(audioType);
                }
                else if (!isIos && ua.indexOf("safari") >= 0 && ua.indexOf("chrome") === -1) {
                    // In Safari browser on Mac,use web audio
                    checkAudioType = false;
                    Html5Capatibility.setAudioType(AudioType.WEB_AUDIO);
                }
                else {
                    checkAudioType = true;
                    Html5Capatibility.setAudioType(AudioType.HTML5_AUDIO);
                }
                if (ua.indexOf("android") >= 0) { //android
                    if (checkAudioType && canUseWebAudio) {
                        Html5Capatibility.setAudioType(AudioType.WEB_AUDIO);
                    }
                }
                else if (isIos) { //ios
                    if (Html5Capatibility.getIOSVersion() >= 7) {
                        Html5Capatibility._canUseBlob = true;
                        if (checkAudioType && canUseWebAudio) {
                            Html5Capatibility.setAudioType(AudioType.WEB_AUDIO);
                        }
                    }
                }
                var winURL = window["URL"] || window["webkitURL"];
                if (!winURL) {
                    Html5Capatibility._canUseBlob = false;
                }
                if (ua.indexOf("egretnative") >= 0) { // Egret Native
                    Html5Capatibility.setAudioType(AudioType.HTML5_AUDIO);
                    Html5Capatibility._canUseBlob = true;
                }
                egret.Sound = window["XyqAudioSound"] || Html5Capatibility._AudioClass;
            };
            Html5Capatibility.setAudioType = function (type) {
                Html5Capatibility._audioType = type;
                switch (type) {
                    case AudioType.WEB_AUDIO:
                        Html5Capatibility._AudioClass = egret.web.WebAudioSound;
                        break;
                    case AudioType.HTML5_AUDIO:
                        Html5Capatibility._AudioClass = egret.web.HtmlSound;
                        break;
                }
            };
            /**
             * @private
             * 获取ios版本
             * @returns {string}
             */
            Html5Capatibility.getIOSVersion = function () {
                var matches = Html5Capatibility.ua.toLowerCase().match(/cpu [^\d]*\d.*like mac os x/);
                if (!matches || matches.length == 0) {
                    return 0;
                }
                var value = matches[0];
                return parseInt(value.match(/\d+(_\d)*/)[0]) || 0;
            };
            //当前浏览器版本是否支持blob
            Html5Capatibility._canUseBlob = false;
            //当前浏览器版本是否支持webaudio
            Html5Capatibility._audioType = 0;
            /**
             * @private
             */
            Html5Capatibility.ua = "";
            return Html5Capatibility;
        }(egret.HashObject));
        web.Html5Capatibility = Html5Capatibility;
        __reflect(Html5Capatibility.prototype, "egret.web.Html5Capatibility");
        /**
         * @private
         */
        var currentPrefix = null;
        /**
         * @private
         */
        function getPrefixStyleName(name, element) {
            var header = "";
            if (element != null) {
                header = getPrefix(name, element);
            }
            else {
                if (currentPrefix == null) {
                    var tempStyle = document.createElement('div').style;
                    currentPrefix = getPrefix("transform", tempStyle);
                }
                header = currentPrefix;
            }
            if (header == "") {
                return name;
            }
            return header + name.charAt(0).toUpperCase() + name.substring(1, name.length);
        }
        web.getPrefixStyleName = getPrefixStyleName;
        /**
         * @private
         */
        function getPrefix(name, element) {
            if (name in element) {
                return "";
            }
            name = name.charAt(0).toUpperCase() + name.substring(1, name.length);
            var transArr = ["webkit", "ms", "Moz", "O"];
            for (var i = 0; i < transArr.length; i++) {
                var tempStyle = transArr[i] + name;
                if (tempStyle in element) {
                    return transArr[i];
                }
            }
            return "";
        }
        web.getPrefix = getPrefix;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        web.globalStage = null;
        /**
         * 创建一个canvas。
         */
        function mainCanvas(width, height) {
            var canvas = createCanvas(width, height);
            if (egret.pro.egret2dDriveMode) {
                egret.pro.mainCanvas = canvas;
            }
            return canvas;
        }
        egret.sys.mainCanvas = mainCanvas;
        function createCanvas(width, height) {
            var canvas = document.createElement("canvas");
            if (!isNaN(width) && !isNaN(height)) {
                canvas.width = width;
                canvas.height = height;
            }
            return canvas;
        }
        egret.sys.createCanvas = createCanvas;
        /**
         * sys.resizeContext。
         */
        function resizeContext(renderContext, width, height, useMaxSize) {
            if (!renderContext) {
                return;
            }
            var webglrendercontext = renderContext;
            var surface = webglrendercontext.surface;
            if (useMaxSize) {
                if (surface.width < width) {
                    surface.width = width;
                }
                if (surface.height < height) {
                    surface.height = height;
                }
            }
            else {
                if (surface.width !== width) {
                    surface.width = width;
                }
                if (surface.height !== height) {
                    surface.height = height;
                }
            }
            webglrendercontext.onResize();
        }
        web.resizeContext = resizeContext;
        egret.sys.resizeContext = resizeContext;
        /**
         * sys.getContextWebGL
         */
        function getContextWebGL(surface) {
            var options = {
                antialias: web.WebGLRenderContext.antialias,
                stencil: true //设置可以使用模板（用于不规则遮罩）
            };
            var gl = null;
            //todo 是否使用chrome源码names
            //let contextNames = ["moz-webgl", "webkit-3d", "experimental-webgl", "webgl", "3d"];
            var names = ["webgl", "experimental-webgl"];
            for (var i = 0; i < names.length; ++i) {
                try {
                    gl = surface.getContext(names[i], options);
                }
                catch (e) {
                }
                if (gl) {
                    break;
                }
            }
            if (!gl) {
                egret.$error(1021);
            }
            return gl;
        }
        egret.sys.getContextWebGL = getContextWebGL;
        /**
         * sys.getContext2d
         */
        function getContext2d(surface) {
            return surface ? surface.getContext('2d') : null;
        }
        web.getContext2d = getContext2d;
        egret.sys.getContext2d = getContext2d;
        /**
         * 创建一个WebGLTexture
         */
        function createTexture(renderContext, bitmapData, premultiplyAlpha, format, type) {
            if (premultiplyAlpha === void 0) { premultiplyAlpha = true; }
            if (format === void 0) { format = egret.GL_FORMAT_RGBA; }
            if (type === void 0) { type = egret.GL_TYPE_UNSIGNED_BYTE; }
            var webglrendercontext = renderContext;
            var gl = webglrendercontext.context;
            var texture = gl.createTexture();
            if (!texture) {
                //先创建texture失败,然后lost事件才发出来..
                webglrendercontext.contextLost = true;
                return;
            }
            texture[egret.glContext] = gl;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha ? 1 : 0);
            texture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL] = premultiplyAlpha;
            gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], gl[format], gl[type], bitmapData);
            if (egret.sys.profileWebGLTexture) {
                if (!texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]) {
                    texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA] = {};
                }
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["format"] = format;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["type"] = type;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["width"] = bitmapData.width;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["height"] = bitmapData.height;
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return texture;
        }
        egret.sys.createTexture = createTexture;
        /**
         * 创建一个WebGLTexture
         */
        function _createTexture(renderContext, width, height, data, premultiplyAlpha, format, type) {
            if (premultiplyAlpha === void 0) { premultiplyAlpha = true; }
            if (format === void 0) { format = egret.GL_FORMAT_RGBA; }
            if (type === void 0) { type = egret.GL_TYPE_UNSIGNED_BYTE; }
            var webglrendercontext = renderContext;
            var gl = webglrendercontext.context;
            var texture = gl.createTexture();
            if (!texture) {
                //先创建texture失败,然后lost事件才发出来..
                webglrendercontext.contextLost = true;
                return null;
            }
            //
            texture[egret.glContext] = gl;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha ? 1 : 0);
            texture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL] = premultiplyAlpha;
            gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], width, height, 0, gl[format], gl[type], data);
            if (egret.sys.profileWebGLTexture) {
                if (!texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]) {
                    texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA] = {};
                }
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["format"] = format;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["type"] = type;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["width"] = width;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["height"] = height;
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return texture;
        }
        egret.sys._createTexture = _createTexture;
        /**
         * 创建一个压缩纹理
         * @param data
         * @param width
         * @param height
         * @param levels
         * @param internalFormat
         * @returns
         */
        function createCompressedTexture(renderContext, data, width, height, levels, internalFormat, premultiplyAlpha) {
            if (premultiplyAlpha === void 0) { premultiplyAlpha = true; }
            var webglrendercontext = renderContext;
            var gl = webglrendercontext.context;
            var texture = gl.createTexture();
            if (!texture) {
                webglrendercontext.contextLost = true;
                return null;
            }
            texture[egret.glContext] = gl;
            texture[egret.is_compressed_texture] = true;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha ? 1 : 0);
            texture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL] = premultiplyAlpha;
            gl.compressedTexImage2D(gl.TEXTURE_2D, levels, internalFormat, width, height, 0, data);
            if (egret.sys.profileWebGLTexture) {
                if (!texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]) {
                    texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA] = {};
                }
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["format"] = internalFormat;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["levels"] = levels;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["width"] = width;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["height"] = height;
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D, null);
            return texture;
        }
        egret.sys.createCompressedTexture = createCompressedTexture;
        /**
         * 更新纹理
         * @param renderContext
         * @param texture
         * @param bitmapData
         * @param glFormat
         * @param type
         */
        function updateTexture(renderContext, texture, bitmapData, premultiplyAlpha, format, type) {
            if (premultiplyAlpha === void 0) { premultiplyAlpha = true; }
            if (format === void 0) { format = egret.GL_FORMAT_RGBA; }
            if (type === void 0) { type = egret.GL_TYPE_UNSIGNED_BYTE; }
            var webglrendercontext = renderContext;
            var gl = webglrendercontext.context;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha ? 1 : 0);
            texture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL] = premultiplyAlpha;
            gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], gl[format], gl[type], bitmapData);
            if (egret.sys.profileWebGLTexture) {
                if (!texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]) {
                    texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA] = {};
                }
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["format"] = format;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["type"] = type;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["width"] = bitmapData.width;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["height"] = bitmapData.height;
            }
        }
        egret.sys.updateTexture = updateTexture;
        /**
         * 更新纹理
         * @param renderContext
         * @param texture
         * @param width
         * @param height
         * @param data
         * @param premultiplyAlpha
         * @param format
         * @param type
         */
        function _updateTexture(renderContext, texture, width, height, data, premultiplyAlpha, format, type) {
            if (premultiplyAlpha === void 0) { premultiplyAlpha = true; }
            if (format === void 0) { format = egret.GL_FORMAT_RGBA; }
            if (type === void 0) { type = egret.GL_TYPE_UNSIGNED_BYTE; }
            var webglrendercontext = renderContext;
            var gl = webglrendercontext.context;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha ? 1 : 0);
            texture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL] = premultiplyAlpha;
            gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], width, height, 0, gl[format], gl[type], data);
            if (egret.sys.profileWebGLTexture) {
                if (!texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]) {
                    texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA] = {};
                }
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["format"] = format;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["type"] = type;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["width"] = width;
                texture[egret.PROFILE_WEBGLTEXTURE_USER_DATA]["height"] = height;
            }
        }
        egret.sys._updateTexture = _updateTexture;
        /**
         * 删除纹理
         * @param webglTexture
         * @returns
         */
        function deleteTexture(webglTexture) {
            if (!webglTexture) {
                return;
            }
            if (webglTexture[egret.engine_default_empty_texture]) {
                if (true) {
                    //引擎默认的空白纹理，不允许删除
                    console.warn('deleteWebGLTexture:' + egret.engine_default_empty_texture);
                }
                return;
            }
            if (webglTexture["atlasTexture"]) {
                //TODO-先不清理
                return;
            }
            var gl = webglTexture[egret.glContext];
            if (gl) {
                gl.deleteTexture(webglTexture);
            }
            else {
                if (true) {
                    console.error('deleteWebGLTexture gl = ' + gl);
                }
            }
            /*old
            if (webglTexture && !webglTexture['engine_default_empty_texture']) {
                const gl = webglTexture['glContext'] as WebGLRenderingContext;//bitmapData.glContext;
                if (gl) {
                    gl.deleteTexture(webglTexture);
                }
                else {
                    console.error('deleteWebGLTexture gl = ' + gl);
                }
            }
            */
        }
        egret.sys.deleteTexture = deleteTexture;
        /**
         * 画texture
         **/
        function drawTextureElements(renderContext, data, offset) {
            var webglrendercontext = renderContext;
            var gl = webglrendercontext.context;
            // 编辑器环境保护：纹理已被 deleteTexture 删除（RES.dispose 等场景）或不属于当前上下文时跳过绘制
            // 避免 INVALID_OPERATION: bindTexture: object does not belong to this context
            // 触发场景：编辑器中 RES.dispose() 删除纹理后渲染循环仍引用旧纹理；
            //           或 iframe 重载导致 WebGL context 切换但旧纹理仍被引用
            // 仅在编辑器环境生效，游戏环境零开销
            if (egret.Capabilities.isEditor) {
                if (!data.texture || !gl.isTexture(data.texture)) {
                    // console.warn('[drawTextureElements] 跳过已删除的纹理，可能由 RES.dispose 触发。gl#' + gl.id);
                    return data.count * 3;
                }
                if (data.texture[egret.glContext] && data.texture[egret.glContext] !== gl) {
                    var ownerGl = data.texture[egret.glContext];
                    // console.warn('[drawTextureElements] 跳过跨上下文纹理，纹理归属 gl#' + (ownerGl ? ownerGl.id : 'null') + '，当前 gl#' + gl.id);
                    return data.count * 3;
                }
            }
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, data.texture);
            var size = data.count * 3;
            gl.drawElements(gl.TRIANGLES, size, gl.UNSIGNED_SHORT, offset * 2);
            return size;
        }
        egret.sys.drawTextureElements = drawTextureElements;
        /**
         * 测量文本的宽度
         * @param context
         * @param text
         */
        function measureTextWith(context, text, cacheType) {
            if (cacheType === void 0) { cacheType = "default"; }
            return context.measureText(text).width;
        }
        egret.sys.measureTextWith = measureTextWith;
        /**
         * 为CanvasRenderBuffer创建一个HTMLCanvasElement
         * @param defaultFunc
         * @param width
         * @param height
         * @param root
         */
        function createCanvasRenderBufferSurface(defaultFunc, width, height, root) {
            return defaultFunc(width, height);
        }
        egret.sys.createCanvasRenderBufferSurface = createCanvasRenderBufferSurface;
        /**
         * 改变渲染缓冲的大小并清空缓冲区
         * @param renderContext
         * @param width
         * @param height
         * @param useMaxSize
         */
        function resizeCanvasRenderBuffer(renderContext, width, height, useMaxSize) {
            var canvasRenderBuffer = renderContext;
            var surface = canvasRenderBuffer.surface;
            if (useMaxSize) {
                var change = false;
                if (surface.width < width) {
                    surface.width = width;
                    change = true;
                }
                if (surface.height < height) {
                    surface.height = height;
                    change = true;
                }
                //尺寸没有变化时,将绘制属性重置
                if (!change) {
                    canvasRenderBuffer.context.globalCompositeOperation = "source-over";
                    canvasRenderBuffer.context.setTransform(1, 0, 0, 1, 0, 0);
                    canvasRenderBuffer.context.globalAlpha = 1;
                }
            }
            else {
                if (surface.width != width) {
                    surface.width = width;
                }
                if (surface.height != height) {
                    surface.height = height;
                }
            }
            canvasRenderBuffer.clear();
        }
        egret.sys.resizeCanvasRenderBuffer = resizeCanvasRenderBuffer;
        egret.Geolocation = egret.web.WebGeolocation;
        egret.Motion = egret.web.WebMotion;
        /**
         *
         * @param name
         * @param path
         */
        function registerFontMapping(name, path) {
            if (window.FontFace) {
                return loadFontByFontFace(name, path);
            }
            else {
                return loadFontByWebStyle(name, path);
            }
        }
        egret.sys.registerFontMapping = registerFontMapping;
        function loadFontByFontFace(name, path) {
            var fontResCache = egret.sys.fontResourceCache;
            if (!fontResCache || !fontResCache[path]) {
                console.warn("registerFontMapping_WARN: Can not find TTF file:" + path + ", please load file first.");
                return;
            }
            var resCache = fontResCache[path];
            var fontFace = new window.FontFace(name, resCache);
            document.fonts.add(fontFace);
            fontFace.load().catch(function (err) {
                console.error("loadFontError:", err);
            });
        }
        ;
        function loadFontByWebStyle(name, path) {
            var styleElement = document.createElement("style");
            styleElement.type = "text/css";
            styleElement.textContent = "\n            @font-face\n            {\n                font-family:\"" + name + "\";\n                src:url(\"" + path + "\");\n            }";
            styleElement.onerror = function (err) {
                console.error("loadFontError:", err);
            };
            document.body.appendChild(styleElement);
        }
        web.isIOS14Device = function () {
            return egret.Capabilities.runtimeType == egret.RuntimeType.WEB
                && egret.Capabilities.os == "iOS"
                && egret.Capabilities.isMobile
                && /iPhone OS 14/.test(window.navigator.userAgent);
        };
        function doBindTexture(gl, index, webGLTexture) {
            gl.activeTexture(gl['TEXTURE' + index]);
            gl.bindTexture(gl.TEXTURE_2D, webGLTexture);
        }
        function getWebGLTexture(webglContext, texture, premultiplyAlpha, format, type) {
            if (premultiplyAlpha === void 0) { premultiplyAlpha = true; }
            if (format === void 0) { format = egret.GL_FORMAT_RGBA; }
            if (type === void 0) { type = egret.GL_TYPE_UNSIGNED_BYTE; }
            if (texture instanceof egret.RenderTexture) {
                return texture.bitmapData.source.texture;
            }
            else if (texture instanceof egret.BitmapData) {
                return webglContext.getWebGLTexture(texture);
            }
            else {
                return webglContext.getWebGLTexture(texture.bitmapData);
            }
        }
        egret.sys.getWebGLTexture = getWebGLTexture;
        function bindTexture(webglContext) {
            if (this.textures) {
                var index = 3;
                var gl = webglContext.context;
                for (var key in this.textures) {
                    var texture = this.textures[key];
                    if (texture instanceof Array) {
                        var uniform = this.uniforms[key] = [];
                        for (var _i = 0, texture_1 = texture; _i < texture_1.length; _i++) {
                            var t = texture_1[_i];
                            if (t && t.bitmapData) {
                                doBindTexture(gl, index, getWebGLTexture(webglContext, t, t.bitmapData.premultiplyAlpha, t.bitmapData.glFormat));
                                if (t.bitmapData.repeatX) {
                                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                                }
                                else {
                                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                                }
                                if (t.bitmapData.repeatY) {
                                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                                }
                                else {
                                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                                }
                                uniform.push(index);
                                index++;
                            }
                        }
                    }
                    else {
                        if (texture && texture.bitmapData) {
                            doBindTexture(gl, index, getWebGLTexture(webglContext, texture, texture.bitmapData.premultiplyAlpha, texture.bitmapData.glFormat));
                            if (texture.bitmapData.repeatX) {
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                            }
                            else {
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                            }
                            if (texture.bitmapData.repeatY) {
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                            }
                            else {
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                            }
                            this.uniforms[key] = index;
                            index++;
                        }
                    }
                }
            }
        }
        egret.CustomFilter.prototype.bindTexture = bindTexture;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         * 刷新所有Egret播放器的显示区域尺寸。仅当使用外部JavaScript代码动态修改了Egret容器大小时，需要手动调用此方法刷新显示区域。
         * 当网页尺寸发生改变时此方法会自动被调用。
         */
        function updateAllScreens() {
            if (!isRunning) {
                return;
            }
            var containerList = document.querySelectorAll(".egret-player");
            var length = containerList.length;
            for (var i = 0; i < length; i++) {
                var container = containerList[i];
                var player = container["egret-player"];
                player.updateScreenSize();
            }
        }
        var isRunning = false;
        /**
         * @private
         * 网页加载完成，实例化页面中定义的Egret标签
         */
        function runEgret(options) {
            if (isRunning) {
                return;
            }
            isRunning = true;
            if (!options) {
                options = {};
            }
            egret.runEgretOptionsIns = options;
            var ua = navigator.userAgent.toLowerCase();
            if (ua.indexOf("egretnative") >= 0 && ua.indexOf("egretwebview") == -1) {
                egret.Capabilities["runtimeType" + ""] = egret.RuntimeType.RUNTIME2;
            }
            if (ua.indexOf("egret-ui-editor") >= 0) {
                //编辑器环境
                egret.Capabilities["isEditor" + ""] = true;
            }
            // 是否启动3d环境
            if (options.pro) {
                egret.pro.egret2dDriveMode = true;
                try {
                    if (window['startup']) {
                        window['startup']();
                    }
                    else {
                        console.error("EgretPro.js don't has function:window.startup");
                    }
                }
                catch (e) {
                    console.error(e);
                }
            }
            if (ua.indexOf("egretnative") >= 0 && egret.nativeRender) { // Egret Native
                egret_native.addModuleCallback(function () {
                    web.Html5Capatibility.$init();
                    // WebGL上下文参数自定义
                    if (options.renderMode == "webgl") {
                        // WebGL抗锯齿默认关闭，提升PC及某些平台性能
                        var antialias = options.antialias && egret.Capabilities.supportAntialias;
                        web.WebGLRenderContext.antialias = !!antialias;
                    }
                    egret.sys.CanvasRenderBuffer = web.CanvasRenderBuffer;
                    setRenderMode(options.renderMode);
                    egret_native.nrSetRenderMode(2);
                    var canvasScaleFactor;
                    if (options.canvasScaleFactor) {
                        canvasScaleFactor = options.canvasScaleFactor;
                    }
                    else if (options.calculateCanvasScaleFactor) {
                        canvasScaleFactor = options.calculateCanvasScaleFactor(egret.sys.canvasHitTestBuffer.context);
                    }
                    else {
                        canvasScaleFactor = window.devicePixelRatio;
                    }
                    egret.sys.DisplayList.$canvasScaleFactor = canvasScaleFactor;
                    var ticker = egret.ticker;
                    startTicker(ticker, options.tickMode);
                    if (options.screenAdapter) {
                        egret.sys.screenAdapter = options.screenAdapter;
                    }
                    else if (!egret.sys.screenAdapter) {
                        egret.sys.screenAdapter = new egret.sys.DefaultScreenAdapter();
                    }
                    var list = document.querySelectorAll(".egret-player");
                    var length = list.length;
                    for (var i = 0; i < length; i++) {
                        var container = list[i];
                        var player = new web.WebPlayer(container, options);
                        container["egret-player"] = player;
                        window["player"] = player;
                    }
                    window.addEventListener("resize", function () {
                        if (isNaN(resizeTimer)) {
                            resizeTimer = window.setTimeout(doResize, 300);
                        }
                    });
                }, null);
                egret_native.initNativeRender();
            }
            else {
                web.Html5Capatibility._audioType = options.audioType;
                web.Html5Capatibility.$init();
                var renderMode = options.renderMode;
                // WebGL上下文参数自定义
                if (renderMode == "webgl") {
                    // WebGL抗锯齿默认关闭，提升PC及某些平台性能
                    var antialias = options.antialias && egret.Capabilities.supportAntialias;
                    web.WebGLRenderContext.antialias = !!antialias;
                    // WebGLRenderContext.antialias = (typeof antialias == undefined) ? true : antialias;
                }
                egret.sys.CanvasRenderBuffer = web.CanvasRenderBuffer;
                if (ua.indexOf("egretnative") >= 0 && renderMode != "webgl") {
                    egret.$warn(1051);
                    renderMode = "webgl";
                }
                setRenderMode(renderMode);
                var canvasScaleFactor = void 0;
                if (options.canvasScaleFactor) {
                    canvasScaleFactor = options.canvasScaleFactor;
                }
                else if (options.calculateCanvasScaleFactor) {
                    canvasScaleFactor = options.calculateCanvasScaleFactor(egret.sys.canvasHitTestBuffer.context);
                }
                else {
                    //based on : https://github.com/jondavidjohn/hidpi-canvas-polyfill
                    var context = egret.sys.canvasHitTestBuffer.context;
                    var backingStore = context.backingStorePixelRatio ||
                        context.webkitBackingStorePixelRatio ||
                        context.mozBackingStorePixelRatio ||
                        context.msBackingStorePixelRatio ||
                        context.oBackingStorePixelRatio ||
                        context.backingStorePixelRatio || 1;
                    canvasScaleFactor = (window.devicePixelRatio || 1) / backingStore;
                }
                egret.sys.DisplayList.$canvasScaleFactor = canvasScaleFactor;
                var ticker_1 = egret.ticker;
                startTicker(ticker_1, options.tickMode);
                if (options.screenAdapter) {
                    egret.sys.screenAdapter = options.screenAdapter;
                }
                else if (!egret.sys.screenAdapter) {
                    egret.sys.screenAdapter = new egret.sys.DefaultScreenAdapter();
                }
                var list = document.querySelectorAll(".egret-player");
                var length_1 = list.length;
                for (var i = 0; i < length_1; i++) {
                    var container = list[i];
                    var player = new web.WebPlayer(container, options);
                    container["egret-player"] = player;
                    window["player"] = player;
                }
                window.addEventListener("resize", function () {
                    if (isNaN(resizeTimer)) {
                        resizeTimer = window.setTimeout(doResize, 300);
                    }
                });
            }
        }
        /**
         * 设置渲染模式。"auto","webgl","canvas"
         * @param renderMode
         */
        function setRenderMode(renderMode) {
            if (renderMode == "webgpu" && egret.sys["$webgpuBackend"]) {
                var backend = egret.sys["$webgpuBackend"];
                egret.sys.RenderBuffer = backend.RenderBuffer;
                egret.sys.systemRenderer = backend.systemRenderer;
                egret.sys.canvasRenderer = new egret.CanvasRenderer();
                egret.sys.customHitTestBuffer = new web.CanvasRenderBuffer(3, 3);
                egret.sys.canvasHitTestBuffer = new web.CanvasRenderBuffer(3, 3);
                egret.Capabilities["renderMode" + ""] = "webgpu";
            }
            else 
            if (renderMode == "webgl" && egret.WebGLUtils.checkCanUseWebGL()) {
                egret.sys.RenderBuffer = web.WebGLRenderBuffer;
                egret.sys.systemRenderer = new web.WebGLRenderer();
                egret.sys.canvasRenderer = new egret.CanvasRenderer();
                egret.sys.customHitTestBuffer = new web.WebGLRenderBuffer(3, 3);
                egret.sys.canvasHitTestBuffer = new web.CanvasRenderBuffer(3, 3);
                egret.Capabilities["renderMode" + ""] = "webgl";
            }
            else {
                egret.sys.RenderBuffer = web.CanvasRenderBuffer;
                egret.sys.systemRenderer = new egret.CanvasRenderer();
                egret.sys.canvasRenderer = egret.sys.systemRenderer;
                egret.sys.customHitTestBuffer = new web.CanvasRenderBuffer(3, 3);
                egret.sys.canvasHitTestBuffer = egret.sys.customHitTestBuffer;
                egret.Capabilities["renderMode" + ""] = "canvas";
            }
        }
        egret.sys.setRenderMode = setRenderMode;
        // === 
        function openMultiRender() {
            egret.log("only support wx");
            return;
        }
        egret.sys.openMultipleRender = openMultiRender;
        function fn2workerURL(fnstr) {
            var blob = new Blob([fnstr], {
                type: 'application/javascript'
            });
            return URL.createObjectURL(blob); // 返回一个 blob URL
        }
        /**
         * @private
         * 启动心跳计时器。
         */
        function startTicker(ticker, tickMode) {
            if (tickMode === void 0) { tickMode = 1; }
            // if(tickMode === 0) {
            var tickWorker;
            try {
                var blob = fn2workerURL("var fps=1;var interval=1000/fps;var i;function onTick(){this.postMessage(0);i=setTimeout(onTick,interval)}onmessage=function(e){e.data?onTick():clearTimeout(i)};");
                tickWorker = typeof Worker ? new Worker(blob) : null;
            }
            catch (e) {
                egret.log(e);
            }
            if (tickWorker) {
                // 心跳使用webworker开一个线程处理，该线程不会被阻塞
                egret.log("Tick use WebWorker");
                // tickWorker.postMessage(30); //每秒30帧
                tickWorker.onmessage = function (evt) {
                    egret.log("onTickerMsg");
                    ticker.update();
                };
                tickWorker.onerror = function (evt) {
                    egret.error('!!!WebWorker Error: ', evt);
                };
                window["tickWorker"] = tickWorker;
                // return;
            }
            // }
            // 不支持Worker用回老方法或者配置用老方法
            egret.log("Tick use requestAnimationFrame");
            var requestAnimationFrame = window["requestAnimationFrame"] ||
                window["webkitRequestAnimationFrame"] ||
                window["mozRequestAnimationFrame"] ||
                window["oRequestAnimationFrame"] ||
                window["msRequestAnimationFrame"];
            if (!requestAnimationFrame) {
                requestAnimationFrame = function (callback) {
                    return window.setTimeout(callback, 1000 / 60);
                };
            }
            requestAnimationFrame(onTick);
            function onTick() {
                ticker.update();
                requestAnimationFrame(onTick);
            }
        }
        //覆盖原生的isNaN()方法实现，在不同浏览器上有2~10倍性能提升。
        window["isNaN"] = function (value) {
            value = +value;
            return value !== value;
        };
        egret.runEgret = runEgret;
        egret.updateAllScreens = updateAllScreens;
        var resizeTimer = NaN;
        function doResize() {
            resizeTimer = NaN;
            egret.updateAllScreens();
        }
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
if (true) {
    var language = navigator.language || navigator["browserLanguage"] || "en_US";
    language = language.replace("-", "_");
    if (language in egret.$locale_strings)
        egret.$language = language;
}
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var WebCapability = /** @class */ (function () {
            function WebCapability() {
            }
            /**
             * @private
             * 检测系统属性
             */
            WebCapability.detect = function () {
                var capabilities = egret.Capabilities;
                var ua = navigator.userAgent.toLowerCase();
                capabilities["isMobile" + ""] = (ua.indexOf('mobile') != -1 || ua.indexOf('android') != -1);
                if (capabilities.isMobile) {
                    if (ua.indexOf("windows") < 0 && (ua.indexOf("iphone") != -1 || ua.indexOf("ipad") != -1 || ua.indexOf("ipod") != -1)) {
                        capabilities["os" + ""] = "iOS";
                    }
                    else if ((ua.indexOf("android") != -1 || ua.indexOf("adr") != -1) && ua.indexOf("linux") != -1) {
                        capabilities["os" + ""] = "Android";
                    }
                    else if (ua.indexOf("windows") != -1) {
                        capabilities["os" + ""] = "Windows Phone";
                    }
                }
                else {
                    if (ua.indexOf("windows nt") != -1) {
                        capabilities["os" + ""] = "Windows PC";
                    }
                    else if (navigator.platform == "MacIntel" && navigator.maxTouchPoints > 1) { //ios 13 Request Desktop Website
                        capabilities["os" + ""] = "iOS";
                        capabilities["isMobile" + ""] = true;
                    }
                    else if (ua.indexOf("mac os") != -1) {
                        capabilities["os" + ""] = "Mac OS";
                    }
                }
                if (capabilities.os === "iOS" || capabilities.os === "Mac OS") {
                    if (ua.indexOf("15_4") != -1) {
                        capabilities["supportAntialias" + ""] = false;
                    }
                }
                var language = (navigator.language || navigator["browserLanguage"]).toLowerCase();
                var strings = language.split("-");
                if (strings.length > 1) {
                    strings[1] = strings[1].toUpperCase();
                }
                capabilities["language" + ""] = strings.join("-");
                capabilities["isInApp" + ""] = false;
                if (egret.Capabilities.runtimeType === egret.RuntimeType.RUNTIME2)
                    capabilities["isInApp" + ""] = true;
                if (!!ua) {
                    if (ua.indexOf('egretwebview') > -1) {
                        capabilities["isInApp" + ""] = true;
                    }
                }
                WebCapability.injectUIntFixOnIE9();
            };
            WebCapability.injectUIntFixOnIE9 = function () {
                if (/msie 9.0/i.test(navigator.userAgent) && !/opera/i.test(navigator.userAgent)) {
                    var IEBinaryToArray_ByteStr_Script = "<!-- IEBinaryToArray_ByteStr -->\r\n" +
                        "<script type='text/vbscript' language='VBScript'>\r\n" +
                        "Function IEBinaryToArray_ByteStr(Binary)\r\n" +
                        "   IEBinaryToArray_ByteStr = CStr(Binary)\r\n" +
                        "End Function\r\n" +
                        "Function IEBinaryToArray_ByteStr_Last(Binary)\r\n" +
                        "   Dim lastIndex\r\n" +
                        "   lastIndex = LenB(Binary)\r\n" +
                        "   if lastIndex mod 2 Then\r\n" +
                        "       IEBinaryToArray_ByteStr_Last = Chr( AscB( MidB( Binary, lastIndex, 1 ) ) )\r\n" +
                        "   Else\r\n" +
                        "       IEBinaryToArray_ByteStr_Last = " + '""' + "\r\n" +
                        "   End If\r\n" +
                        "End Function\r\n" + "<\/script>\r\n" +
                        "<!-- convertResponseBodyToText -->\r\n" +
                        "<script>\r\n" +
                        "let convertResponseBodyToText = function (binary) {\r\n" +
                        "   let byteMapping = {};\r\n" +
                        "   for ( let i = 0; i < 256; i++ ) {\r\n" +
                        "       for ( let j = 0; j < 256; j++ ) {\r\n" +
                        "           byteMapping[ String.fromCharCode( i + j * 256 ) ] =\r\n" +
                        "           String.fromCharCode(i) + String.fromCharCode(j);\r\n" +
                        "       }\r\n" +
                        "   }\r\n" +
                        "   let rawBytes = IEBinaryToArray_ByteStr(binary);\r\n" +
                        "   let lastChr = IEBinaryToArray_ByteStr_Last(binary);\r\n" +
                        "   return rawBytes.replace(/[\\s\\S]/g," +
                        "                           function( match ) { return byteMapping[match]; }) + lastChr;\r\n" +
                        "};\r\n" +
                        "<\/script>\r\n";
                    document.write(IEBinaryToArray_ByteStr_Script);
                }
            };
            return WebCapability;
        }());
        web.WebCapability = WebCapability;
        __reflect(WebCapability.prototype, "egret.web.WebCapability");
        WebCapability.detect();
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var WebFps = /** @class */ (function () {
            function WebFps(stage, showFPS, showLog, logFilter, styles) {
                this.showPanle = true;
                this.fpsHeight = 0;
                this.WIDTH = 101;
                this.HEIGHT = 20;
                this.bgCanvasColor = "#18304b";
                this.fpsFrontColor = "#18fefe";
                this.WIDTH_COST = 50;
                this.cost1Color = "#18fefe";
                // private cost2Color = "#ffff00";
                this.cost3Color = "#ff0000";
                this.arrFps = [];
                this.arrCost = [];
                this.arrTweenCost = [];
                this.arrLog = [];
                if (showFPS || showLog) {
                    if (egret.Capabilities.renderMode == 'canvas') {
                        this.renderMode = "Canvas";
                    }
                    else {
                        this.renderMode = "WebGL";
                    }
                    this.panelX = styles["x"] === undefined ? 0 : parseInt(styles['x']);
                    this.panelY = styles["y"] === undefined ? 0 : parseInt(styles['y']);
                    this.fontColor = styles["textColor"] === undefined ? '#ffffff' : styles['textColor'].replace("0x", "#");
                    this.fontSize = styles["size"] === undefined ? 12 : parseInt(styles['size']);
                    if (egret.Capabilities.isMobile) {
                        this.fontSize -= 2;
                    }
                    var all = document.createElement('div');
                    all.style.position = 'absolute';
                    all.style.background = "rgba(0,0,0," + styles['bgAlpha'] + ")";
                    all.style.left = this.panelX + 'px';
                    all.style.top = this.panelY + 'px';
                    all.style.pointerEvents = 'none';
                    all.id = 'egret-fps-panel';
                    document.body.appendChild(all);
                    var container = document.createElement('div');
                    container.style.color = this.fontColor;
                    container.style.fontSize = this.fontSize + 'px';
                    container.style.lineHeight = this.fontSize + 'px';
                    container.style.margin = '4px 4px 4px 4px';
                    this.container = container;
                    all.appendChild(container);
                    if (showFPS)
                        this.addFps();
                    if (showLog)
                        this.addLog();
                }
            }
            WebFps.prototype.addFps = function () {
                var div = document.createElement('div');
                div.style.display = 'inline-block';
                this.containerFps = div;
                this.container.appendChild(div);
                var fps = document.createElement('div');
                fps.style.paddingBottom = '2px';
                this.fps = fps;
                this.containerFps.appendChild(fps);
                fps.innerHTML = "0 FPS " + this.renderMode + "<br/>min0 max0 avg0";
                var canvas = document.createElement('canvas');
                this.containerFps.appendChild(canvas);
                canvas.width = this.WIDTH;
                canvas.height = this.HEIGHT;
                this.canvasFps = canvas;
                var context = canvas.getContext('2d');
                this.contextFps = context;
                context.fillStyle = this.bgCanvasColor;
                context.fillRect(0, 0, this.WIDTH, this.HEIGHT);
                var divDatas = document.createElement('div');
                this.divDatas = divDatas;
                this.containerFps.appendChild(divDatas);
                var left = document.createElement('div');
                left.style['float'] = 'left';
                left.innerHTML = "Sprite<br/>Draw<br/>Canvas<br/>Cost";
                divDatas.appendChild(left);
                var right = document.createElement('div');
                right.style.paddingLeft = left.offsetWidth + 20 + "px";
                divDatas.appendChild(right);
                var sprite = document.createElement('div');
                this.divSprites = sprite;
                sprite.innerHTML = "0<br/>";
                right.appendChild(sprite);
                var draw = document.createElement('div');
                this.divDraw = draw;
                draw.innerHTML = "0<br/>";
                right.appendChild(draw);
                var renderCanvas = document.createElement('div');
                this.divRenderCanvas = renderCanvas;
                renderCanvas.innerHTML = "0<br/>";
                right.appendChild(renderCanvas);
                var cost = document.createElement('div');
                this.divCost = cost;
                cost.innerHTML = "<font  style=\"color:" + this.cost1Color + "\">0<font/> <font  style=\"color:" + this.cost3Color + "\">0<font/>";
                right.appendChild(cost);
                canvas = document.createElement('canvas');
                this.canvasCost = canvas;
                this.containerFps.appendChild(canvas);
                canvas.width = this.WIDTH;
                canvas.height = this.HEIGHT;
                context = canvas.getContext('2d');
                this.contextCost = context;
                context.fillStyle = this.bgCanvasColor;
                context.fillRect(0, 0, this.WIDTH, this.HEIGHT);
                context.fillStyle = "#000000";
                context.fillRect(this.WIDTH_COST, 0, 1, this.HEIGHT);
                this.containerFps.appendChild(document.createElement('div'));
                var drawBatch = document.createElement('div');
                drawBatch.style['float'] = 'left';
                drawBatch.innerHTML = 'DrawBatches<br/>';
                this.divDrawBatch = drawBatch;
                this.containerFps.appendChild(drawBatch);
                this.containerFps.appendChild(document.createElement('div'));
                var setPassCall = document.createElement('div');
                setPassCall.style['float'] = 'left';
                setPassCall.innerHTML = 'SetPass Call<br/>';
                this.divSetPassCall = setPassCall;
                this.containerFps.appendChild(setPassCall);
                this.containerFps.appendChild(document.createElement('div'));
                var tweenTickCost = document.createElement('div');
                tweenTickCost.style['float'] = 'left';
                tweenTickCost.innerHTML = 'TweenCost<br/>';
                this.divTweenCost = tweenTickCost;
                this.containerFps.appendChild(tweenTickCost);
                this.containerFps.appendChild(document.createElement('div'));
                var ocComputed = document.createElement('div');
                ocComputed.style['float'] = 'left';
                ocComputed.innerHTML = 'OC Computed<br/>';
                this.divOcComputed = ocComputed;
                this.containerFps.appendChild(ocComputed);
                this.containerFps.appendChild(document.createElement('div'));
                var ocCulled = document.createElement('div');
                ocCulled.style['float'] = 'left';
                ocCulled.innerHTML = 'OC Culled<br/>';
                this.divOcCulled = ocCulled;
                this.containerFps.appendChild(ocCulled);
                this.containerFps.appendChild(document.createElement('div'));
                var fpsDetail = document.createElement('div');
                fpsDetail.style['float'] = 'left';
                fpsDetail.innerHTML = 'FPS Detail<br/>high0 mid0 low0';
                this.divFpsDetail = fpsDetail;
                this.containerFps.appendChild(fpsDetail);
                this.containerFps.appendChild(document.createElement('div'));
                var jankCnt = document.createElement('div');
                jankCnt.style['float'] = 'left';
                jankCnt.innerHTML = 'Jank<br/>';
                this.divJankCnt = jankCnt;
                this.containerFps.appendChild(jankCnt);
                this.containerFps.appendChild(document.createElement('div'));
                var curLoadingCount = document.createElement('div');
                curLoadingCount.style['float'] = 'left';
                curLoadingCount.innerHTML = 'LoadingCnt<br/>';
                this.divCurLoadingCnt = curLoadingCount;
                this.containerFps.appendChild(curLoadingCount);
                this.containerFps.appendChild(document.createElement('div'));
                var curSkinConstructTaskCnt = document.createElement('div');
                curSkinConstructTaskCnt.style['float'] = 'left';
                curSkinConstructTaskCnt.innerHTML = 'SkinConstructTaskCnt<br/>';
                this.divCurSkinConsTaskCnt = curSkinConstructTaskCnt;
                this.containerFps.appendChild(curSkinConstructTaskCnt);
                this.fpsHeight = this.container.offsetHeight;
            };
            WebFps.prototype.addLog = function () {
                var log = document.createElement('div');
                log.style.maxWidth = document.body.clientWidth - 8 - this.panelX + 'px';
                log.style.wordWrap = "break-word";
                this.log = log;
                this.container.appendChild(log);
            };
            WebFps.prototype.update = function (datas, showLastData) {
                if (showLastData === void 0) { showLastData = false; }
                var numFps;
                var numCostTicker;
                var numCostRender;
                var numCostTween;
                if (!showLastData) {
                    numFps = datas.fps;
                    numCostTicker = datas.costTicker;
                    numCostRender = datas.costRender;
                    numCostTween = datas.costTween;
                    this.lastNumDraw = datas.draw;
                    this.lastNumDrawBatch = datas.drawBatch;
                    this.lastNumSetPassCall = datas.setPassCall;
                    this.lastNumOcComputed = datas.ocComputed;
                    this.lastNumOcCulled = datas.ocCulled;
                    this.lastNumFpsLow = datas.fpsLow;
                    this.lastNumFpsMid = datas.fpsMiddle;
                    this.lastNumFpsHigh = datas.fpsHigh;
                    this.lastNumJank = datas.jankCnt;
                    this.lastNumBigJank = datas.bigJankCnt;
                    this.lastNumSprites = datas.sprites;
                    this.lastNumRenderCanvas = datas.renderCanvas;
                    this.arrFps.push(numFps);
                    this.arrCost.push([numCostTicker, numCostRender]);
                    this.arrTweenCost.push(numCostTween);
                }
                else {
                    numFps = this.arrFps[this.arrFps.length - 1];
                    numCostTicker = this.arrCost[this.arrCost.length - 1][0];
                    numCostRender = this.arrCost[this.arrCost.length - 1][1];
                    numCostTween = this.arrTweenCost[this.arrTweenCost.length - 1];
                }
                var fpsTotal = 0;
                var lenFps = this.arrFps.length;
                if (lenFps > 101) {
                    lenFps = 101;
                    this.arrFps.shift();
                    this.arrCost.shift();
                    this.arrTweenCost.shift();
                }
                var fpsMin = this.arrFps[0];
                var fpsMax = this.arrFps[0];
                for (var i = 0; i < lenFps; i++) {
                    var num = this.arrFps[i];
                    fpsTotal += num;
                    if (num < fpsMin)
                        fpsMin = num;
                    else if (num > fpsMax)
                        fpsMax = num;
                }
                var WIDTH = this.WIDTH;
                var HEIGHT = this.HEIGHT;
                var context = this.contextFps;
                context.drawImage(this.canvasFps, 1, 0, WIDTH - 1, HEIGHT, 0, 0, WIDTH - 1, HEIGHT);
                context.fillStyle = this.bgCanvasColor;
                context.fillRect(WIDTH - 1, 0, 1, HEIGHT);
                var lastHeight = Math.floor(numFps / 60 * 20);
                if (lastHeight < 1)
                    lastHeight = 1;
                context.fillStyle = this.fpsFrontColor;
                context.fillRect(WIDTH - 1, 20 - lastHeight, 1, lastHeight);
                var WIDTH_COST = this.WIDTH_COST;
                context = this.contextCost;
                context.drawImage(this.canvasCost, 1, 0, WIDTH_COST - 1, HEIGHT, 0, 0, WIDTH_COST - 1, HEIGHT);
                context.drawImage(this.canvasCost, WIDTH_COST + 2, 0, WIDTH_COST - 1, HEIGHT, WIDTH_COST + 1, 0, WIDTH_COST - 1, HEIGHT);
                var c1Height = Math.floor(numCostTicker / 2);
                if (c1Height < 1)
                    c1Height = 1;
                else if (c1Height > 20)
                    c1Height = 20;
                //todo lcj
                var c2Height = Math.floor(numCostRender / 2);
                if (c2Height < 1)
                    c2Height = 1;
                else if (c2Height > 20)
                    c2Height = 20;
                context.fillStyle = this.bgCanvasColor;
                context.fillRect(WIDTH_COST - 1, 0, 1, HEIGHT);
                context.fillRect(WIDTH_COST * 2, 0, 1, HEIGHT);
                context.fillRect(WIDTH_COST * 3 + 1, 0, 1, HEIGHT);
                context.fillStyle = this.cost1Color;
                context.fillRect(WIDTH_COST - 1, 20 - c1Height, 1, c1Height);
                context.fillStyle = this.cost3Color;
                context.fillRect(WIDTH_COST * 2, 20 - c2Height, 1, c2Height);
                var fpsAvg = Math.floor(fpsTotal / lenFps);
                var fpsOutput = numFps + " FPS " + this.renderMode;
                if (this.showPanle) {
                    fpsOutput += "<br/>min" + fpsMin + " max" + fpsMax + " avg" + fpsAvg;
                    this.divSprites.innerHTML = this.lastNumSprites + "<br/>";
                    this.divDraw.innerHTML = this.lastNumDraw + "<br/>";
                    this.divRenderCanvas.innerHTML = this.lastNumRenderCanvas + "<br/>";
                    this.divCost.innerHTML = "<font  style=\"color:#18fefe\">" + numCostTicker + "<font/> <font  style=\"color:#ff0000\">" + numCostRender + "<font/>";
                }
                this.fps.innerHTML = fpsOutput;
                this.divDrawBatch.innerHTML = "DrawBatches       " + this.lastNumDrawBatch;
                this.divSetPassCall.innerHTML = "SetPassCalls      " + this.lastNumSetPassCall;
                this.divOcComputed.innerHTML = "OC Computed      " + this.lastNumOcComputed;
                this.divOcCulled.innerHTML = "OC Culled        " + this.lastNumOcCulled;
                this.divFpsDetail.innerHTML = "FPS Detail<br/>high " + this.lastNumFpsHigh + " mid " + this.lastNumFpsMid + " low " + this.lastNumFpsLow;
                this.divJankCnt.innerHTML = "Jank    " + this.lastNumJank + ", BigJank    " + this.lastNumBigJank;
                this.divTweenCost.innerHTML = "TweenCost        <font  style=\"color:#ffff00\">" + numCostTween + "<font/>";
            };
            ;
            WebFps.prototype.updateSingle = function (key, showKey, value) {
                if (this[key]) {
                    this[key].innerHTML = showKey + "           " + value;
                }
            };
            WebFps.prototype.updateInfo = function (info) {
                this.arrLog.push(info);
                this.updateLogLayout();
            };
            WebFps.prototype.updateWarn = function (info) {
                this.arrLog.push("[Warning]" + info);
                this.updateLogLayout();
            };
            WebFps.prototype.updateError = function (info) {
                this.arrLog.push("[Error]" + info);
                this.updateLogLayout();
            };
            WebFps.prototype.updateLogLayout = function () {
                this.log.innerHTML = this.arrLog.join('<br/>');
                while (document.body.clientHeight < (this.log.offsetHeight + this.fpsHeight + this.panelY + this.fontSize * 2)) {
                    this.arrLog.shift();
                    this.log.innerHTML = this.arrLog.join('<br/>');
                }
            };
            return WebFps;
        }());
        web.WebFps = WebFps;
        __reflect(WebFps.prototype, "egret.web.WebFps", ["egret.FPSDisplay"]);
        egret.FPSDisplay = WebFps;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        function getOption(key) {
            if (window.location) {
                var search = location.search;
                if (search == "") {
                    return "";
                }
                search = search.slice(1);
                var searchArr = search.split("&");
                var length_2 = searchArr.length;
                for (var i = 0; i < length_2; i++) {
                    var str = searchArr[i];
                    var arr = str.split("=");
                    if (arr[0] == key) {
                        return arr[1];
                    }
                }
            }
            return "";
        }
        web.getOption = getOption;
        egret.getOption = getOption;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var WebPlayer = /** @class */ (function (_super) {
            __extends(WebPlayer, _super);
            function WebPlayer(container, options) {
                var _this = _super.call(this) || this;
                _this.updateAfterTyping = false;
                _this.canvasAdapterSize = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
                _this.init(container, options);
                _this.initOrientation();
                return _this;
            }
            WebPlayer.prototype.init = function (container, options) {
                var _this = this;
                console.log("Egret Engine Version:", egret.Capabilities.engineVersion);
                var option = this.readOption(container, options);
                var stage = new egret.Stage();
                stage.$screen = this;
                stage.$scaleMode = option.scaleMode;
                stage.$orientation = option.orientation;
                stage.$maxTouches = option.maxTouches;
                stage.frameRate = option.frameRate;
                stage.textureScaleFactor = option.textureScaleFactor;
                if (options.enableLimitScreenBufferSize && options.limitScreenBufferSize) {
                    egret.sys.enableLimitOutputScreenSize = options.enableLimitScreenBufferSize;
                    egret.sys.limitOutputScreenSizeWidth = options.limitScreenBufferSize;
                }
                var buffer = new egret.sys.RenderBuffer(undefined, undefined, true);
                var canvas = buffer.surface;
                this.attachCanvas(container, canvas);
                var webTouch = new web.WebTouchHandler(stage, canvas);
                var player = new egret.sys.Player(buffer, stage, option.entryClassName, options.entryClass);
                egret.web.globalStage = stage;
                egret.ticker.stage = stage;
                egret.lifecycle.stage = stage;
                egret.lifecycle.addLifecycleListener(web.WebLifeCycleHandler);
                var webInput = new web.HTMLInput();
                if (option.showFPS || option.showLog) {
                    if (!egret.nativeRender) {
                        player.displayFPS(option.showFPS, option.showLog, option.logFilter, option.fpsStyles);
                    }
                }
                this.playerOption = option;
                this.container = container;
                this.canvas = canvas;
                this.stage = stage;
                this.player = player;
                this.webTouchHandler = webTouch;
                this.webInput = webInput;
                webInput.finishUserTyping = function () {
                    if (_this.updateAfterTyping) {
                        setTimeout(function () {
                            _this.updateScreenSize();
                            _this.updateAfterTyping = false;
                        }, 300);
                    }
                };
                egret.web.$cacheTextAdapter(webInput, stage, container, canvas);
                this.updateScreenSize();
                this.updateMaxTouches();
                player.start();
            };
            WebPlayer.prototype.initOrientation = function () {
                var self = this;
                window.addEventListener("orientationchange", function () {
                    window.setTimeout(function () {
                        egret.StageOrientationEvent.dispatchStageOrientationEvent(self.stage, egret.StageOrientationEvent.ORIENTATION_CHANGE);
                    }, 350);
                });
            };
            /**
             * 读取初始化参数
             */
            WebPlayer.prototype.readOption = function (container, options) {
                var option = {};
                option.entryClassName = container.getAttribute("data-entry-class");
                option.scaleMode = container.getAttribute("data-scale-mode") || egret.StageScaleMode.NO_SCALE;
                option.frameRate = +container.getAttribute("data-frame-rate") || 30;
                option.contentWidth = +container.getAttribute("data-content-width") || 480;
                option.contentHeight = +container.getAttribute("data-content-height") || 800;
                option.orientation = container.getAttribute("data-orientation") || egret.OrientationMode.AUTO;
                option.maxTouches = +container.getAttribute("data-multi-fingered") || 2;
                option.textureScaleFactor = +container.getAttribute("texture-scale-factor") || 1;
                option.showFPS = container.getAttribute("data-show-fps") == "true";
                var styleStr = container.getAttribute("data-show-fps-style") || "";
                var stylesArr = styleStr.split(",");
                var styles = {};
                for (var i = 0; i < stylesArr.length; i++) {
                    var tempStyleArr = stylesArr[i].split(":");
                    styles[tempStyleArr[0]] = tempStyleArr[1];
                }
                option.fpsStyles = styles;
                option.showLog = container.getAttribute("data-show-log") == "true";
                option.logFilter = container.getAttribute("data-log-filter");
                return option;
            };
            /**
             * @private
             * 添加canvas到container。
             */
            WebPlayer.prototype.attachCanvas = function (container, canvas) {
                var style = canvas.style;
                style.cursor = "inherit";
                style.position = "absolute";
                style.top = "0";
                style.bottom = "0";
                style.left = "0";
                style.right = "0";
                container.appendChild(canvas);
                style = container.style;
                style.overflow = "hidden";
                style.position = "absolute";
            };
            /**
             * @private
             * 更新播放器视口尺寸
             */
            WebPlayer.prototype.updateScreenSize = function () {
                var _a, _b, _c, _d;
                var canvas = this.canvas;
                if (canvas['userTyping']) {
                    this.updateAfterTyping = true;
                    return;
                }
                var showLog = !egret.Capabilities.isEditor;
                showLog && console.warn("updateScreenSize ----------------------------------------------------------------------");
                showLog && console.warn("updateScreenSize canvas width:" + canvas.width + ", height:" + canvas.height);
                showLog && console.warn("updateScreenSize scaleMode:" + ((_a = this.stage) === null || _a === void 0 ? void 0 : _a.scaleMode));
                showLog && console.warn("updateScreenSize renderBufferSize:" + this.player["screenDisplayList"]["renderBuffer"]["surface"]["width"] + ", " + this.player["screenDisplayList"]["renderBuffer"]["surface"]["height"]);
                var option = this.playerOption;
                var screenRect = this.container.getBoundingClientRect();
                var top = 0;
                var boundingClientWidth = screenRect.width;
                var boundingClientHeight = screenRect.height;
                if (boundingClientWidth == 0 || boundingClientHeight == 0) {
                    return;
                }
                if (screenRect.top < 0) {
                    boundingClientHeight += screenRect.top;
                    top = -screenRect.top;
                }
                var shouldRotate = false;
                var orientation = this.stage.$orientation;
                if (orientation != egret.OrientationMode.AUTO) {
                    shouldRotate = orientation != egret.OrientationMode.PORTRAIT && boundingClientHeight > boundingClientWidth
                        || orientation == egret.OrientationMode.PORTRAIT && boundingClientWidth > boundingClientHeight;
                }
                var screenWidth = shouldRotate ? boundingClientHeight : boundingClientWidth;
                var screenHeight = shouldRotate ? boundingClientWidth : boundingClientHeight;
                egret.Capabilities["boundingClientWidth" + ""] = screenWidth;
                egret.Capabilities["boundingClientHeight" + ""] = screenHeight;
                showLog && console.warn("updateScreenSize boundingClientWidth:" + boundingClientWidth + ", boundingClientHeight:" + boundingClientHeight);
                showLog && console.warn("updateScreenSize screenWidth:" + screenWidth + ", screenHeight:" + screenHeight);
                var stageSize = egret.sys.screenAdapter.calculateStageSize(this.stage.$scaleMode, screenWidth, screenHeight, option.contentWidth, option.contentHeight);
                var stageWidth = stageSize.stageWidth;
                var stageHeight = stageSize.stageHeight;
                var displayWidth = stageSize.displayWidth;
                //TODO-ios 13宽屏有问题，先强制加1像素
                // displayWidth += 1;
                var displayHeight = stageSize.displayHeight;
                // displayHeight += 1;
                canvas.style[egret.web.getPrefixStyleName("transformOrigin")] = "0% 0% 0px";
                if (canvas.width != stageWidth) {
                    canvas.width = stageWidth;
                }
                if (canvas.height != stageHeight) {
                    canvas.height = stageHeight;
                }
                var rotation = 0;
                if (shouldRotate) {
                    if (orientation == egret.OrientationMode.LANDSCAPE) { //
                        rotation = 90;
                        canvas.style.top = top + (boundingClientHeight - displayWidth) / 2 + "px";
                        canvas.style.left = (boundingClientWidth + displayHeight) / 2 + "px";
                    }
                    else {
                        rotation = -90;
                        canvas.style.top = top + (boundingClientHeight + displayWidth) / 2 + "px";
                        canvas.style.left = (boundingClientWidth - displayHeight) / 2 + "px";
                    }
                }
                else {
                    canvas.style.top = top + (boundingClientHeight - displayHeight) / 2 + "px";
                    canvas.style.left = (boundingClientWidth - displayWidth) / 2 + "px";
                }
                var scalex = displayWidth / stageWidth, scaley = displayHeight / stageHeight;
                var canvasScaleX = scalex * egret.sys.DisplayList.$canvasScaleFactor;
                var canvasScaleY = scaley * egret.sys.DisplayList.$canvasScaleFactor;
                if (egret.Capabilities.renderMode == "canvas") {
                    //TODO-向上取整会使gl buffer变大，在某些手机上可能会有问题，先不向上取整
                    canvasScaleX = Math.ceil(canvasScaleX);
                    canvasScaleY = Math.ceil(canvasScaleY);
                }
                showLog && console.warn("updateScreenSize =====calculateStageSize=====");
                showLog && console.warn("updateScreenSize scaleMode:" + ((_b = this.stage) === null || _b === void 0 ? void 0 : _b.scaleMode));
                showLog && console.warn("updateScreenSize canvas width:" + canvas.width + ", height:" + canvas.height);
                showLog && console.warn("updateScreenSize stageWidth:" + stageWidth + ", stageHeigth:" + stageHeight + ", displayWidth:" + displayWidth + ", displayHeight:" + displayHeight);
                showLog && console.warn("updateScreenSize canvasScaleFactor:" + egret.sys.DisplayList.$canvasScaleFactor);
                showLog && console.warn("updateScreenSize scalex:" + scalex + ", scaley:" + scaley + ", canvasScaleX:" + canvasScaleX + ", canvasScaleY:" + canvasScaleY);
                if (egret.sys.enableLimitOutputScreenSize) {
                    //限制最大分辨率
                    var bufferWidth = stageWidth * canvasScaleX;
                    var bufferHeight = stageHeight * canvasScaleY;
                    if (bufferWidth > egret.sys.limitOutputScreenSizeWidth) {
                        var limitScale = egret.sys.limitOutputScreenSizeWidth / bufferWidth;
                        canvasScaleX *= limitScale;
                        canvasScaleY *= limitScale;
                    }
                }
                // 小游戏环境高性能+情况下，canvas尺寸小于屏幕尺寸时需要处理
                // 因为通过canvas的tranform缩放不生效，且高性能+模式下canvas不会自动铺满屏幕，需要业务处理
                if (this.stage.scaleMode == egret.StageScaleMode.MINIGAME_HIGH_PERF_PLUS_SHOW_ALL) {
                    var bufferWidth = stageWidth * canvasScaleX;
                    var bufferHeight = stageHeight * canvasScaleY;
                    if (bufferWidth < screenWidth || bufferHeight < screenHeight) {
                        // canvas尺寸小于屏幕尺寸时，需要将canvas尺寸调整到屏幕尺寸
                        // 选用相差较大的边进行调整
                        var highPerfPlusScale = 1;
                        if ((screenWidth / bufferWidth) > (screenHeight / bufferHeight)) {
                            highPerfPlusScale = screenWidth / bufferWidth;
                        }
                        else {
                            highPerfPlusScale = screenHeight / bufferHeight;
                        }
                        canvasScaleX *= highPerfPlusScale;
                        canvasScaleY *= highPerfPlusScale;
                    }
                }
                // canvasScaleX = parseFloat(canvasScaleX.toFixed(7));
                // canvasScaleY = parseFloat(canvasScaleY.toFixed(7));
                showLog && console.warn("updateScreenSize =====limiteOutputScreenSize=====");
                showLog && console.warn("enableLimitOutputScreenSize:" + egret.sys.enableLimitOutputScreenSize + ", " + egret.sys.limitOutputScreenSizeWidth);
                showLog && console.warn("updateScreenSize scalex:" + scalex + ", scaley:" + scaley + ", canvasScaleX:" + canvasScaleX + ", canvasScaleY:" + canvasScaleY);
                var m = egret.Matrix.create();
                m.identity();
                m.scale(scalex / canvasScaleX, scaley / canvasScaleY);
                m.rotate(rotation * Math.PI / 180);
                var transform = "matrix(" + m.a + "," + m.b + "," + m.c + "," + m.d + "," + m.tx + "," + m.ty + ")";
                egret.Matrix.release(m);
                canvas.style[egret.web.getPrefixStyleName("transform")] = transform;
                egret.sys.DisplayList.$setCanvasScale(canvasScaleX, canvasScaleY);
                this.webTouchHandler.updateScaleMode(scalex, scaley, rotation);
                this.webInput.$updateSize();
                this.player.updateStageSize(stageWidth, stageHeight, screenWidth, screenHeight); //不要在这个方法后面修改属性
                showLog && console.warn("updateScreenSize =====updateStageSize=====");
                showLog && console.warn("updateScreenSize scaleMode:" + ((_c = this.stage) === null || _c === void 0 ? void 0 : _c.scaleMode));
                showLog && console.warn("updateScreenSize canvas width:" + canvas.width + ", height:" + canvas.height);
                showLog && console.warn("updateScreenSize stageWidth:" + stageWidth + ", stageHeigth:" + stageHeight + ", displayWidth:" + displayWidth + ", displayHeight:" + displayHeight);
                showLog && console.warn("updateScreenSize canvas transform:" + canvas.style[egret.web.getPrefixStyleName("transform")]);
                showLog && console.warn("updateScreenSize renderBufferSize:" + this.player["screenDisplayList"]["renderBuffer"]["surface"]["width"] + ", " + this.player["screenDisplayList"]["renderBuffer"]["surface"]["height"]);
                // todo
                if (egret.nativeRender) {
                    canvas.width = stageWidth * canvasScaleX;
                    canvas.height = stageHeight * canvasScaleY;
                }
                // this.setCanvasAdapterSize( scalex / canvasScaleX, scaley / canvasScaleY, stageWidth, stageHeight, screenWidth, screenHeight);
                this.setCanvasAdapterSizeNew(stageWidth, stageHeight, canvas.width, canvas.height, screenWidth, screenHeight, scalex / canvasScaleX, scaley / canvasScaleY);
                showLog && console.warn("updateScreenSize =====setCanvasAdapterSize=====");
                showLog && console.warn("updateScreenSize scaleMode:" + ((_d = this.stage) === null || _d === void 0 ? void 0 : _d.scaleMode));
                showLog && console.warn("updateScreenSize canvas width:" + canvas.width + ", height:" + canvas.height);
                showLog && console.warn("updateScreenSize stageWidth:" + stageWidth + ", stageHeigth:" + stageHeight + ", displayWidth:" + displayWidth + ", displayHeight:" + displayHeight);
                showLog && console.warn("updateScreenSize renderBufferSize:" + this.player["screenDisplayList"]["renderBuffer"]["surface"]["width"] + ", " + this.player["screenDisplayList"]["renderBuffer"]["surface"]["height"]);
                showLog && console.warn("updateScreenSize canvasAdapterSize: x:" + this.canvasAdapterSize.x + ", scaleX: " + this.canvasAdapterSize.scaleX);
                showLog && console.warn("updateScreenSize ----------------------------------------------------------------------");
            };
            WebPlayer.prototype.setContentSize = function (width, height) {
                var option = this.playerOption;
                option.contentWidth = width;
                option.contentHeight = height;
                this.updateScreenSize();
            };
            WebPlayer.prototype.setCanvasAdapterSize = function (canvasScaleX, canvasScaleY, stageWidth, stageHeight, displayWidth, displayHeight) {
                //小游戏canvas会自动铺满整个屏幕，在FixedWidth模式下，应该处理宽:
                //高被自动缩放到与屏幕等高，宽自动缩放到与屏幕等宽
                //为了保持画面比例，调整宽度，canvasAdapterSize.scaleY为缩放到当前屏幕高的系数
                //因为width会自动缩放到当前屏幕大小，所有需要考虑 displayWidth/stageWidth
                var scaleX = canvasScaleY / (displayWidth / stageWidth);
                var offsetX = stageWidth * (1.0 - scaleX) / 2.0;
                this.canvasAdapterSize.x = offsetX;
                this.canvasAdapterSize.y = 0;
                this.canvasAdapterSize.scaleX = scaleX;
                this.canvasAdapterSize.scaleY = 1.0;
            };
            WebPlayer.prototype.setCanvasAdapterSizeNew = function (stageWidth, stageHeight, canvasWidth, canvasHeight, screenWidth, screenHeight, canvasScaleX, canvasScaleY) {
                //小游戏canvas会自动铺满整个屏幕,需要处理宽的缩放
                var scaleX = (screenHeight / canvasHeight) / (screenWidth / canvasWidth);
                var offsetX = stageWidth * (1.0 - scaleX) / 2.0;
                if (this.stage.scaleMode == egret.StageScaleMode.MINIGAME_HIGH_PERF_PLUS_SHOW_ALL) {
                    scaleX = screenHeight / stageHeight;
                    offsetX = ((screenWidth - canvasWidth * canvasScaleX * scaleX) / 2);
                }
                this.canvasAdapterSize.x = offsetX;
                this.canvasAdapterSize.y = 0;
                this.canvasAdapterSize.scaleX = scaleX;
                this.canvasAdapterSize.scaleY = 1.0;
            };
            /**
             * @private
             * 更新触摸数量
             */
            WebPlayer.prototype.updateMaxTouches = function () {
                this.webTouchHandler.$updateMaxTouches();
            };
            WebPlayer.prototype.showFPS = function (showFPS, showLog, logFilter, styles) {
                if (this.player) {
                    this.player.displayFPS(showFPS, showLog, logFilter, styles);
                }
            };
            return WebPlayer;
        }(egret.HashObject));
        web.WebPlayer = WebPlayer;
        __reflect(WebPlayer.prototype, "egret.web.WebPlayer", ["egret.sys.Screen"]);
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        var sharedCanvas;
        var sharedContext;
        /**
         * @private
         */
        function convertImageToCanvas(texture, rect) {
            if (!sharedCanvas) {
                sharedCanvas = egret.sys.createCanvas();
                sharedContext = sharedCanvas.getContext("2d");
            }
            var w = texture.$getTextureWidth();
            var h = texture.$getTextureHeight();
            if (rect == null) {
                rect = egret.$TempRectangle;
                rect.x = 0;
                rect.y = 0;
                rect.width = w;
                rect.height = h;
            }
            rect.x = Math.min(rect.x, w - 1);
            rect.y = Math.min(rect.y, h - 1);
            rect.width = Math.min(rect.width, w - rect.x);
            rect.height = Math.min(rect.height, h - rect.y);
            var iWidth = rect.width;
            var iHeight = rect.height;
            var surface = sharedCanvas;
            surface["style"]["width"] = iWidth + "px";
            surface["style"]["height"] = iHeight + "px";
            sharedCanvas.width = iWidth;
            sharedCanvas.height = iHeight;
            if (egret.Capabilities.renderMode == "webgl") {
                var renderTexture = void 0;
                //webgl下非RenderTexture纹理先画到RenderTexture
                if (!texture.$renderBuffer) {
                    if (egret.sys.systemRenderer.renderClear) {
                        egret.sys.systemRenderer.renderClear();
                    }
                    renderTexture = new egret.RenderTexture();
                    renderTexture.drawToTexture(new egret.Bitmap(texture));
                }
                else {
                    renderTexture = texture;
                }
                //从RenderTexture中读取像素数据，填入canvas
                var pixels = renderTexture.$renderBuffer.getPixels(rect.x, rect.y, iWidth, iHeight);
                var imageData = new ImageData(iWidth, iHeight);
                for (var i = 0; i < pixels.length; i++) {
                    imageData.data[i] = pixels[i];
                }
                sharedContext.putImageData(imageData, 0, 0);
                if (!texture.$renderBuffer) {
                    renderTexture.dispose();
                }
                return surface;
            }
            else {
                var bitmapData = texture;
                var offsetX = Math.round(bitmapData.$offsetX);
                var offsetY = Math.round(bitmapData.$offsetY);
                var bitmapWidth = bitmapData.$bitmapWidth;
                var bitmapHeight = bitmapData.$bitmapHeight;
                sharedContext.drawImage(bitmapData.$bitmapData.source, bitmapData.$bitmapX + rect.x / egret.$TextureScaleFactor, bitmapData.$bitmapY + rect.y / egret.$TextureScaleFactor, bitmapWidth * rect.width / w, bitmapHeight * rect.height / h, offsetX, offsetY, rect.width, rect.height);
                return surface;
            }
        }
        /**
         * @private
         */
        function toDataURL(type, rect, encoderOptions) {
            try {
                var surface = convertImageToCanvas(this, rect);
                var result = surface.toDataURL(type, encoderOptions);
                return result;
            }
            catch (e) {
                egret.$error(1033);
            }
            return null;
        }
        /**
         * 有些杀毒软件认为 saveToFile 可能是一个病毒文件
         */
        function eliFoTevas(type, filePath, rect, encoderOptions) {
            var base64 = toDataURL.call(this, type, rect, encoderOptions);
            if (base64 == null) {
                return;
            }
            var href = base64.replace(/^data:image[^;]*/, "data:image/octet-stream");
            var aLink = document.createElement('a');
            aLink['download'] = filePath;
            aLink.href = href;
            var evt = document.createEvent('MouseEvents');
            evt.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            aLink.dispatchEvent(evt);
        }
        function getPixel32(x, y) {
            egret.$warn(1041, "getPixel32", "getPixels");
            return this.getPixels(x, y);
        }
        function getPixels(x, y, width, height) {
            if (width === void 0) { width = 1; }
            if (height === void 0) { height = 1; }
            //webgl环境下不需要转换成canvas获取像素信息
            if (egret.Capabilities.renderMode == "webgl") {
                var renderTexture = void 0;
                //webgl下非RenderTexture纹理先画到RenderTexture
                if (!this.$renderBuffer) {
                    renderTexture = new egret.RenderTexture();
                    renderTexture.drawToTexture(new egret.Bitmap(this));
                }
                else {
                    renderTexture = this;
                }
                //从RenderTexture中读取像素数据
                var pixels = renderTexture.$renderBuffer.getPixels(x, y, width, height);
                return pixels;
            }
            try {
                var surface = convertImageToCanvas(this);
                var result = sharedContext.getImageData(x, y, width, height).data;
                return result;
            }
            catch (e) {
                egret.$error(1039);
            }
        }
        egret.Texture.prototype.toDataURL = toDataURL;
        egret.Texture.prototype.saveToFile = eliFoTevas;
        egret.Texture.prototype.getPixel32 = getPixel32;
        egret.Texture.prototype.getPixels = getPixels;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         * XML节点基类
         */
        var XMLNode = /** @class */ (function () {
            /**
             * @private
             */
            function XMLNode(nodeType, parent) {
                this.nodeType = nodeType;
                this.parent = parent;
            }
            return XMLNode;
        }());
        web.XMLNode = XMLNode;
        __reflect(XMLNode.prototype, "egret.web.XMLNode");
        /**
         * @private
         * XML节点对象
         */
        var XML = /** @class */ (function (_super) {
            __extends(XML, _super);
            /**
             * @private
             */
            function XML(localName, parent, prefix, namespace, name) {
                var _this = _super.call(this, 1, parent) || this;
                /**
                 * @private
                 * 当前节点上的属性列表
                 */
                _this.attributes = {};
                /**
                 * @private
                 * 当前节点的子节点列表
                 */
                _this.children = [];
                _this.localName = localName;
                _this.prefix = prefix;
                _this.namespace = namespace;
                _this.name = name;
                return _this;
            }
            return XML;
        }(XMLNode));
        web.XML = XML;
        __reflect(XML.prototype, "egret.web.XML");
        /**
         * @private
         * XML文本节点
         */
        var XMLText = /** @class */ (function (_super) {
            __extends(XMLText, _super);
            /**
             * @private
             */
            function XMLText(text, parent) {
                var _this = _super.call(this, 3, parent) || this;
                _this.text = text;
                return _this;
            }
            return XMLText;
        }(XMLNode));
        web.XMLText = XMLText;
        __reflect(XMLText.prototype, "egret.web.XMLText");
        var parser = new DOMParser();
        /**
         * @private
         * 解析字符串为XML对象
         * @param text 要解析的字符串
         */
        function parse(text) {
            var xmlDoc = parser.parseFromString(text, "text/xml");
            var length = xmlDoc.childNodes.length;
            for (var i = 0; i < length; i++) {
                var node = xmlDoc.childNodes[i];
                if (node.nodeType == 1) {
                    return parseNode(node, null);
                }
            }
            return null;
        }
        /**
         * @private
         * 解析一个节点
         */
        function parseNode(node, parent) {
            if (node.localName == "parsererror") {
                throw new Error(node.textContent);
            }
            var xml = new XML(node.localName, parent, node["prefix"], node.namespaceURI, node.nodeName);
            var nodeAttributes = node.attributes;
            var attributes = xml.attributes;
            var length = nodeAttributes.length;
            var isIgnore = node.tagName.indexOf("tween") >= 0;
            // let isShaderNode = false;
            for (var i = 0; i < length; i++) {
                var attributeNode = nodeAttributes[i];
                var name_1 = attributeNode.name;
                if (name_1.indexOf("xmlns:") == 0) {
                    continue;
                }
                attributes[name_1] = attributeNode.value;
                // if(["fragmentSource","uniformDict","vertexSource"].indexOf(name)>=0){
                //     isShaderNode = true;
                // }
                xml["$" + name_1] = attributeNode.value;
                if (!isIgnore) {
                    if (name_1 == "id") {
                        attributes.name_ = attributeNode.value;
                    }
                }
            }
            // if(isShaderNode){
            //     xml[`$visible`] = "false";
            //     xml.attributes["visible"] = "false";
            // }
            var childNodes = node.childNodes;
            length = childNodes.length;
            var children = xml.children;
            for (var i = 0; i < length; i++) {
                var childNode = childNodes[i];
                var nodeType = childNode.nodeType;
                var childXML = null;
                if (nodeType == 1) {
                    childXML = parseNode(childNode, xml);
                }
                else if (nodeType == 3) {
                    var text = childNode.textContent.trim();
                    if (text) {
                        childXML = new XMLText(text, xml);
                    }
                }
                if (childXML) {
                    children.push(childXML);
                }
            }
            return xml;
        }
        egret.XML = { parse: parse };
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var WebDeviceOrientation = /** @class */ (function (_super) {
            __extends(WebDeviceOrientation, _super);
            function WebDeviceOrientation() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                /**
                 * @private
                 */
                _this.onChange = function (e) {
                    var event = new egret.OrientationEvent(egret.Event.CHANGE);
                    event.beta = e.beta;
                    event.gamma = e.gamma;
                    event.alpha = e.alpha;
                    _this.dispatchEvent(event);
                };
                return _this;
            }
            /**
             * @private
             *
             */
            WebDeviceOrientation.prototype.start = function () {
                window.addEventListener("deviceorientation", this.onChange);
            };
            /**
             * @private
             *
             */
            WebDeviceOrientation.prototype.stop = function () {
                window.removeEventListener("deviceorientation", this.onChange);
            };
            return WebDeviceOrientation;
        }(egret.EventDispatcher));
        web.WebDeviceOrientation = WebDeviceOrientation;
        __reflect(WebDeviceOrientation.prototype, "egret.web.WebDeviceOrientation", ["egret.DeviceOrientation"]);
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
egret.DeviceOrientation = egret.web.WebDeviceOrientation;
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        if (true) {
            var logFuncs_1;
            function setLogLevel(logType) {
                if (logFuncs_1 == null) {
                    logFuncs_1 = {
                        "error": console.error,
                        "debug": console.debug,
                        "warn": console.warn,
                        "info": console.info,
                        "log": console.log
                    };
                }
                switch (logType) {
                    case egret.Logger.OFF:
                        console.error = function () {
                        };
                    case egret.Logger.ERROR:
                        console.warn = function () {
                        };
                    case egret.Logger.WARN:
                        console.info = function () {
                        };
                        console.log = function () {
                        };
                    case egret.Logger.INFO:
                        console.debug = function () {
                        };
                    default:
                        break;
                }
                switch (logType) {
                    case egret.Logger.ALL:
                    case egret.Logger.DEBUG:
                        console.debug = logFuncs_1["debug"];
                    case egret.Logger.INFO:
                        console.log = logFuncs_1["log"];
                        console.info = logFuncs_1["info"];
                    case egret.Logger.WARN:
                        console.warn = logFuncs_1["warn"];
                    case egret.Logger.ERROR:
                        console.error = logFuncs_1["error"];
                    default:
                        break;
                }
            }
            Object.defineProperty(egret.Logger, "logLevel", {
                set: setLogLevel,
                enumerable: true,
                configurable: true
            });
        }
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         * 绘制指令管理器
         * 用来维护drawData数组
         */
        var WebGLDrawCmdManager = /** @class */ (function () {
            function WebGLDrawCmdManager() {
                /**
                 * 用于缓存绘制命令的数组
                 */
                this.drawData = [];
                this.drawDataLen = 0;
            }
            /**
             * 压入绘制矩形指令
             */
            WebGLDrawCmdManager.prototype.pushDrawRect = function () {
                if (this.drawDataLen == 0 || this.drawData[this.drawDataLen - 1].type != 1 /* RECT */) {
                    var data = this.drawData[this.drawDataLen] || {};
                    data.type = 1 /* RECT */;
                    data.count = 0;
                    this.drawData[this.drawDataLen] = data;
                    this.drawDataLen++;
                }
                this.drawData[this.drawDataLen - 1].count += 2;
            };
            WebGLDrawCmdManager.prototype.pushDrawSdfRect = function (color, alpha) {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 20 /* SDF_RECT */;
                data.count = 0;
                var hex = color;
                var r = ((hex >> 16) & 255) / 255;
                var g = ((hex >> 8) & 255) / 255;
                var b = (hex & 255) / 255;
                data.vColor = { x: r, y: g, z: b, w: alpha };
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
                this.drawData[this.drawDataLen - 1].count += 2;
            };
            /**
             * DrawTexture合批,将最后一个DrawTexture命令合批到dest命令后
             */
            WebGLDrawCmdManager.prototype.batchDrawTexture = function (dest, count) {
                if (count === void 0) { count = 2; }
                this.drawData[dest].count += count;
                this.drawData.splice(this.drawDataLen - 1, 1);
                this.drawDataLen--;
            };
            WebGLDrawCmdManager.prototype.batchDrawCmd = function (src, dest) {
                var count = this.drawData[src].count;
                this.drawData[dest].count += count;
                //src count变为0
                this.drawData[src].count = 0;
                //type变为IGNORE，渲染时可以跳过
                this.drawData[src].type = 19 /* IGNORE */;
                return true;
            };
            /**
             * 压入绘制texture指令
             */
            WebGLDrawCmdManager.prototype.pushDrawTexture = function (texture, count, filter, textureWidth, textureHeight, buffer, batchType, depthMasks, hierarchy) {
                if (count === void 0) { count = 2; }
                if (egret.sys.disableGLClear)
                    return;
                if (filter) {
                    // 目前有滤镜的情况下不会合并绘制
                    var data = this.drawData[this.drawDataLen] || {};
                    data.type = 0 /* TEXTURE */;
                    data.texture = texture;
                    data.filter = filter;
                    data.count = count;
                    data.textureWidth = textureWidth;
                    data.textureHeight = textureHeight;
                    data.batchType = batchType;
                    this.drawData[this.drawDataLen] = data;
                    this.drawDataLen++;
                }
                else {
                    if (hierarchy || this.drawDataLen == 0 || this.drawData[this.drawDataLen - 1].type != 0 /* TEXTURE */ || texture != this.drawData[this.drawDataLen - 1].texture || this.drawData[this.drawDataLen - 1].filter) {
                        var data = this.drawData[this.drawDataLen] || {};
                        data.type = 0 /* TEXTURE */;
                        data.texture = texture;
                        data.count = 0;
                        data.batchType = batchType;
                        data.depthMasks = depthMasks;
                        this.drawData[this.drawDataLen] = data;
                        this.drawDataLen++;
                    }
                    this.drawData[this.drawDataLen - 1].count += count;
                }
            };
            WebGLDrawCmdManager.prototype.pushChangeSmoothing = function (texture, smoothing) {
                texture["smoothing"] = smoothing;
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 18 /* SMOOTHING */;
                data.texture = texture;
                data.smoothing = smoothing;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            /**
             * 压入pushMask指令
             */
            WebGLDrawCmdManager.prototype.pushPushMask = function (count) {
                if (count === void 0) { count = 1; }
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 3 /* PUSH_MASK */;
                data.count = count * 2;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            WebGLDrawCmdManager.prototype.pushPushMaskTex = function (texture, mat, uv2Clamp, allowUV2Clamp, buffer) {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 4 /* PUSH_MASK_TEX */;
                data.texture = texture;
                data.texture2Mat = egret.Matrix.create();
                data.texture2Mat.copyFrom(mat);
                data.uv2Clamp = uv2Clamp;
                data.allowUV2Clamp = allowUV2Clamp;
                data.buffer = buffer;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            /**
             * 压入popMask指令
             */
            WebGLDrawCmdManager.prototype.pushPopMask = function (count) {
                if (count === void 0) { count = 1; }
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 7 /* POP_MASK */;
                data.count = count * 2;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            WebGLDrawCmdManager.prototype.pushPopMaskTex = function () {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 8 /* POP_MASK_TEX */;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            WebGLDrawCmdManager.prototype.pushPushStencilMaskBegin = function () {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 5 /* PUSH_STENCIL_MASK_BEGIN */;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            WebGLDrawCmdManager.prototype.pushPushStencilMaskEnd = function () {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 6 /* PUSH_STENCIL_MASK_END */;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            WebGLDrawCmdManager.prototype.pushPopStencilMaskBegin = function () {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 9 /* POP_STENCIL_MASK_BEGIN */;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            WebGLDrawCmdManager.prototype.pushPopStencilMaskEnd = function () {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 10 /* POP_STENCIL_MASK_END */;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            /**
             * 压入混色指令
             */
            WebGLDrawCmdManager.prototype.pushSetBlend = function (value) {
                var len = this.drawDataLen;
                // 有无遍历到有效绘图操作
                var drawState = false;
                for (var i = len - 1; i >= 0; i--) {
                    var data = this.drawData[i];
                    if (data) {
                        if (data.type == 0 /* TEXTURE */ || data.type == 1 /* RECT */) {
                            drawState = true;
                        }
                        // 如果与上一次blend操作之间无有效绘图，上一次操作无效
                        if (!drawState && data.type == 12 /* BLEND */) {
                            // this.drawData.splice(i, 1);
                            // this.drawDataLen--;
                            // continue;
                            data.value = value;
                            return;
                        }
                        else {
                            break;
                        }
                        // 如果与上一次blend操作重复，本次操作无效
                        // if(data.type == DRAWABLE_TYPE.BLEND) {
                        //     if(data.value == value) {
                        //         return;
                        //     } else {
                        //         break;
                        //     }
                        // }
                    }
                }
                var _data = this.drawData[this.drawDataLen] || {};
                _data.type = 12 /* BLEND */;
                _data.value = value;
                this.drawData[this.drawDataLen] = _data;
                this.drawDataLen++;
            };
            /*
             * 压入resize render target命令
             */
            WebGLDrawCmdManager.prototype.pushResize = function (buffer, width, height) {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 13 /* RESIZE_TARGET */;
                data.buffer = buffer;
                data.width = width;
                data.height = height;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            /*
             * 压入clear color命令
             */
            WebGLDrawCmdManager.prototype.pushClearColor = function () {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 14 /* CLEAR_COLOR */;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            /**
             * 压入激活buffer命令
             */
            WebGLDrawCmdManager.prototype.pushActivateBuffer = function (buffer) {
                var len = this.drawDataLen;
                // 有无遍历到有效绘图操作
                var drawState = false;
                for (var i = len - 1; i >= 0; i--) {
                    var data = this.drawData[i];
                    if (data) {
                        if (data.type != 12 /* BLEND */ && data.type != 15 /* ACT_BUFFER */) {
                            drawState = true;
                        }
                        // 如果与上一次buffer操作之间无有效绘图，上一次操作无效
                        if (!drawState && data.type == 15 /* ACT_BUFFER */) {
                            // this.drawData.splice(i, 1);
                            // this.drawDataLen--;
                            // continue;
                            data.buffer = buffer;
                            data.width = buffer.rootRenderTarget.width;
                            data.height = buffer.rootRenderTarget.height;
                            return;
                        }
                        else {
                            break;
                        }
                        // 如果与上一次buffer操作重复，本次操作无效
                        // if(data.type == DRAWABLE_TYPE.ACT_BUFFER) {
                        //     if(data.buffer == buffer) {
                        //         return;
                        //     } else {
                        //         break;
                        //     }
                        // }
                    }
                }
                var _data = this.drawData[this.drawDataLen] || {};
                _data.type = 15 /* ACT_BUFFER */;
                _data.buffer = buffer;
                _data.width = buffer.rootRenderTarget.width;
                _data.height = buffer.rootRenderTarget.height;
                this.drawData[this.drawDataLen] = _data;
                this.drawDataLen++;
            };
            /*
             * 压入enabel scissor命令
             */
            WebGLDrawCmdManager.prototype.pushEnableScissor = function (x, y, width, height) {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 16 /* ENABLE_SCISSOR */;
                data.x = x;
                data.y = y;
                data.width = width;
                data.height = height;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            /*
             * 压入disable scissor命令
             */
            WebGLDrawCmdManager.prototype.pushDisableScissor = function () {
                var data = this.drawData[this.drawDataLen] || {};
                data.type = 17 /* DISABLE_SCISSOR */;
                this.drawData[this.drawDataLen] = data;
                this.drawDataLen++;
            };
            /**
             * 清空命令数组
             */
            WebGLDrawCmdManager.prototype.clear = function () {
                // for(let i = 0; i < this.drawDataLen; i++) {
                //     let data = this.drawData[i];
                //     data.type = 0;
                //     data.count = 0;
                //     data.texture = null;
                //     data.filter = null;
                //     //data.uv = null;
                //     data.value = "";
                //     data.buffer = null;
                //     data.width = 0;
                //     data.height = 0;
                //     data.textureWidth = 0;
                //     data.textureHeight = 0;
                //     data.smoothing = false;
                //     data.x = 0;
                //     data.y = 0;
                // }
                this.drawData.length = 0;
                this.drawDataLen = 0;
            };
            return WebGLDrawCmdManager;
        }());
        web.WebGLDrawCmdManager = WebGLDrawCmdManager;
        __reflect(WebGLDrawCmdManager.prototype, "egret.web.WebGLDrawCmdManager");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         * WebGLRenderTarget
         * A WebGL render target with a frame buffer and texture
         */
        var WebGLRenderTarget = /** @class */ (function (_super) {
            __extends(WebGLRenderTarget, _super);
            function WebGLRenderTarget(gl, width, height, glFormat, glType) {
                if (glFormat === void 0) { glFormat = egret.GL_FORMAT_RGBA; }
                if (glType === void 0) { glType = egret.GL_TYPE_UNSIGNED_BYTE; }
                var _this = _super.call(this) || this;
                _this.clearColor = [0, 0, 0, 0];
                /**
                 * If frame buffer is enabled, the default is true
                 */
                _this.useFrameBuffer = true;
                _this.gl = gl;
                _this.glFormat = glFormat;
                _this.glType = glType;
                _this._resize(width, height);
                return _this;
            }
            WebGLRenderTarget.prototype._resize = function (width, height) {
                // Chrome alerts if the size is 0
                width = width || 1;
                height = height || 1;
                if (width < 1) {
                    if (true) {
                        egret.warn('WebGLRenderTarget _resize width = ' + width);
                    }
                    width = 1;
                }
                if (height < 1) {
                    if (true) {
                        egret.warn('WebGLRenderTarget _resize height = ' + height);
                    }
                    height = 1;
                }
                this.width = width;
                this.height = height;
            };
            WebGLRenderTarget.prototype.resize = function (width, height) {
                this._resize(width, height);
                var gl = this.gl;
                if (this.frameBuffer) {
                    this.updateTexture();
                }
                if (this.stencilBuffer) {
                    gl.deleteRenderbuffer(this.stencilBuffer);
                    this.stencilBuffer = null;
                }
            };
            WebGLRenderTarget.prototype.activate = function () {
                var gl = this.gl;
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.getFrameBuffer());
            };
            WebGLRenderTarget.prototype.getFrameBuffer = function () {
                if (!this.useFrameBuffer) {
                    return null;
                }
                return this.frameBuffer;
            };
            WebGLRenderTarget.prototype.initFrameBuffer = function () {
                if (!this.frameBuffer) {
                    var gl = this.gl;
                    this.texture = this.createTexture();
                    this.frameBuffer = gl.createFramebuffer();
                    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
                }
            };
            WebGLRenderTarget.prototype.createTexture = function () {
                //就是创建空的纹理
                var webglrendercontext = this.assignWebGLRenderContext || web.WebGLRenderContext.getInstance(0, 0);
                return egret.sys._createTexture(webglrendercontext, this.width, this.height, null, true, this.glFormat, this.glType);
                /*
                const gl = this.gl;
                const texture: WebGLTexture = gl.createTexture();
                texture[glContext] = gl;
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                return texture;
                */
            };
            WebGLRenderTarget.prototype.updateTexture = function () {
                var webglrendercontext = this.assignWebGLRenderContext || web.WebGLRenderContext.getInstance(0, 0);
                egret.sys._updateTexture(webglrendercontext, this.texture, this.width, this.height, null, true, this.glFormat, this.glType);
                /*
                let gl = this.gl;
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl[this.glFormat], gl[this.glType], null);
                // gl.bindTexture(gl.TEXTURE_2D, null);
                */
            };
            WebGLRenderTarget.prototype.clear = function (bind) {
                if (egret.sys.disableGLClear)
                    return;
                var gl = this.gl;
                if (bind) {
                    this.activate();
                }
                gl.colorMask(true, true, true, true);
                gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
                gl.clear(gl.COLOR_BUFFER_BIT);
            };
            WebGLRenderTarget.prototype.enabledStencil = function () {
                if (!this.frameBuffer || this.stencilBuffer) {
                    return;
                }
                var gl = this.gl;
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
                this.stencilBuffer = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, this.stencilBuffer);
                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, this.width, this.height);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.stencilBuffer);
                // Is unbundling a bug here?
                // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            };
            WebGLRenderTarget.prototype.dispose = function () {
                egret.WebGLUtils.deleteWebGLTexture(this.texture);
            };
            return WebGLRenderTarget;
        }(egret.HashObject));
        web.WebGLRenderTarget = WebGLRenderTarget;
        __reflect(WebGLRenderTarget.prototype, "egret.web.WebGLRenderTarget");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        //TO DO
        var debugLogCompressedTextureNotSupported = {};
        var sysSamplerMask = "sysSamplerMask";
        var sysMat1to2 = "sysMat1to2";
        var sysUVClamp = "sysUVClamp";
        var sysSamplerMaskUVOffset = "sysSamplerMaskUVOffset";
        /**
         * @private
         * WebGL上下文对象，提供简单的绘图接口
         * 抽象出此类，以实现共用一个context
         */
        var WebGLRenderContext = /** @class */ (function () {
            //for 3D&2D
            function WebGLRenderContext(width, height, context, bNew) {
                //
                this._defaultEmptyTexture = null;
                this.currentBlendMode = "";
                this.currentEquation = "add";
                this.glID = null;
                this.projectionX = NaN;
                this.projectionY = NaN;
                this.contextLost = false;
                //refactor
                this._supportedCompressedTextureInfo = [];
                this.$extBlendMinMax = null;
                this.$derivatives = null;
                this.$textureLod = null;
                this.$scissorState = false;
                this.vertexCountPerTriangle = 3;
                this.triangleCountPerQuad = 2;
                this.dataCountPerVertex = 5;
                this.vertSize = 5;
                //for 3D&2D
                /**
                 * @private
                 */
                this.$beforeRender = function () {
                    var gl = this.context;
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
                    gl.disable(gl.DEPTH_TEST);
                    gl.disable(gl.CULL_FACE);
                    gl.enable(gl.BLEND);
                    gl.disable(gl.STENCIL_TEST);
                    gl.colorMask(true, true, true, true);
                    this.setBlendMode("source-over");
                    // 目前只使用0号材质单元，默认开启
                    gl.activeTexture(gl.TEXTURE0);
                    this.currentProgram = null;
                };
                if (bNew) {
                    this.surface = egret.sys.createCanvas(width, height);
                }
                else {
                    this.surface = egret.sys.mainCanvas(width, height);
                }
                if (egret.nativeRender) {
                    return;
                }
                //for 3D&2D
                this.initWebGL(context);
                this.getSupportedCompressedTexture();
                this.$bufferStack = [];
                var gl = this.context;
                this.vertexBuffer = gl.createBuffer();
                this.indexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
                this.drawCmdManager = new web.WebGLDrawCmdManager();
                this.vao = new web.WebGLVertexArrayObject();
                this.$maskTextureStack = [];
                this.setGlobalCompositeOperation("source-over");
                this.prepareShaderPrograms();
            }
            //for 3D&2D
            WebGLRenderContext.getInstance = function (width, height, context) {
                if (this.instance) {
                    return this.instance;
                }
                //for 3D&2D
                this.instance = new WebGLRenderContext(width, height, context);
                return this.instance;
            };
            /**
             * 推入一个RenderBuffer并绑定
             */
            WebGLRenderContext.prototype.pushBuffer = function (buffer) {
                if (buffer != this.currentBuffer) {
                    this.$bufferStack.push(buffer);
                    this.drawCmdManager.pushActivateBuffer(buffer);
                    this.currentBuffer = buffer;
                    return true;
                }
                return false;
            };
            /**
             * 推出一个RenderBuffer并绑定上一个RenderBuffer
             */
            WebGLRenderContext.prototype.popBuffer = function () {
                // 如果只剩下一个buffer，则不执行pop操作
                // 保证舞台buffer永远在最开始
                if (this.$bufferStack.length <= 1) {
                    return;
                }
                var buffer = this.$bufferStack.pop();
                var lastBuffer = this.$bufferStack[this.$bufferStack.length - 1];
                this.drawCmdManager.pushActivateBuffer(lastBuffer);
                this.currentBuffer = lastBuffer;
            };
            /**
             * 启用RenderBuffer
             */
            WebGLRenderContext.prototype.activateBuffer = function (buffer, width, height) {
                buffer.rootRenderTarget.activate();
                if (!this.bindIndices) {
                    this.uploadIndicesArray(this.vao.getIndices());
                }
                buffer.restoreStencil();
                buffer.restoreScissor();
                this.onResize(width, height);
            };
            /**
             * 上传顶点数据
             */
            WebGLRenderContext.prototype.uploadVerticesArray = function (array) {
                var gl = this.context;
                gl.bufferData(gl.ARRAY_BUFFER, array, gl.STREAM_DRAW);
                // gl.bufferSubData(gl.ARRAY_BUFFER, 0, array);
            };
            /**
             * 上传索引数据
             */
            WebGLRenderContext.prototype.uploadIndicesArray = function (array) {
                var gl = this.context;
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);
                this.bindIndices = true;
            };
            /**
             * 销毁绘制对象
             */
            WebGLRenderContext.prototype.destroy = function () {
                this.surface.width = this.surface.height = 0;
            };
            WebGLRenderContext.prototype.onResize = function (width, height) {
                width = width || this.surface.width;
                height = height || this.surface.height;
                this.projectionX = width / 2;
                this.projectionY = -height / 2;
                if (this.context) {
                    this.context.viewport(0, 0, width, height);
                }
            };
            /**
             * 改变渲染缓冲的大小并清空缓冲区
             * @param width 改变后的宽
             * @param height 改变后的高
             * @param useMaxSize 若传入true，则将改变后的尺寸与已有尺寸对比，保留较大的尺寸。
             */
            WebGLRenderContext.prototype.resize = function (width, height, useMaxSize) {
                egret.sys.resizeContext(this, width, height, useMaxSize);
                /*
                let surface = this.surface;
                if (useMaxSize) {
                    if (surface.width < width) {
                        surface.width = width;
                    }
                    if (surface.height < height) {
                        surface.height = height;
                    }
                }
                else {
                    if (surface.width != width) {
                        surface.width = width;
                    }
                    if (surface.height != height) {
                        surface.height = height;
                    }
                }
    
                this.onResize();
                */
            };
            WebGLRenderContext.prototype._buildSupportedCompressedTextureInfo = function (/*gl: WebGLRenderingContext, compressedTextureExNames: string[],*/ extensions) {
                // if (compressedTextureExNames.length === 0) {
                //     return [];
                // }
                var returnValue = [];
                // for (const exName of compressedTextureExNames) {
                //     const extension = gl.getExtension(exName);
                for (var _i = 0, extensions_1 = extensions; _i < extensions_1.length; _i++) {
                    var extension = extensions_1[_i];
                    if (!extension) {
                        continue;
                    }
                    var info = {
                        extensionName: extension.name,
                        supportedFormats: []
                    };
                    //
                    for (var key in extension) {
                        info.supportedFormats.push([key, extension[key]]);
                    }
                    //
                    if (true) {
                        if (info.supportedFormats.length === 0) {
                            console.error('buildSupportedCompressedTextureInfo failed = ' + extension.name);
                        }
                        else {
                            egret.log('support: ' + extension.name);
                            for (var key in extension) {
                                egret.log(key, extension[key], '0x' + extension[key].toString(16));
                            }
                        }
                    }
                    returnValue.push(info);
                }
                return returnValue;
            };
            //for 3D&2D
            WebGLRenderContext.prototype.initWebGL = function (context) {
                this.onResize();
                this.surface.addEventListener("webglcontextlost", this.handleContextLost.bind(this), false);
                this.surface.addEventListener("webglcontextrestored", this.handleContextRestored.bind(this), false);
                context ? this.setContext(context) : this.getWebGLContext();
                var gl = this.context;
                this.$maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                //refactor
                // this._caps.astc = this._gl.getExtension('WEBGL_compressed_texture_astc') || this._gl.getExtension('WEBKIT_WEBGL_compressed_texture_astc');
                // this._caps.s3tc = this._gl.getExtension('WEBGL_compressed_texture_s3tc') || this._gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc');
                // this._caps.pvrtc = this._gl.getExtension('WEBGL_compressed_texture_pvrtc') || this._gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc');
                // this._caps.etc1 = this._gl.getExtension('WEBGL_compressed_texture_etc1') || this._gl.getExtension('WEBKIT_WEBGL_compressed_texture_etc1');
                // this._caps.etc2 = this._gl.getExtension('WEBGL_compressed_texture_etc') || this._gl.getExtension('WEBKIT_WEBGL_compressed_texture_etc') ||
                //     this._gl.getExtension('WEBGL_compressed_texture_es3_0'); // also a requirement of OpenGL ES 3
                // const compressedTextureExNames = [
                //     'WEBGL_compressed_texture_pvrtc', 'WEBKIT_WEBGL_compressed_texture_pvrtc',
                //     'WEBGL_compressed_texture_etc1', 'WEBKIT_WEBGL_compressed_texture_etc1',
                //     'WEBGL_compressed_texture_etc', 'WEBKIT_WEBGL_compressed_texture_etc',
                //     'WEBGL_compressed_texture_astc', 'WEBKIT_WEBGL_compressed_texture_astc',
                //     'WEBGL_compressed_texture_s3tc', 'WEBKIT_WEBGL_compressed_texture_s3tc',
                //     'WEBGL_compressed_texture_es3_0'];
                //
                this.$extBlendMinMax = gl.getExtension('EXT_blend_minmax');
                this.$derivatives = gl.getExtension('OES_standard_derivatives');
                if (this.$derivatives) {
                    egret.Capabilities['supportedDdxDdy'] = true;
                }
            };
            WebGLRenderContext.prototype.getSupportedCompressedTexture = function () {
                var gl = this.context ? this.context : egret.sys.getContextWebGL(this.surface);
                this.pvrtc = gl.getExtension('WEBGL_compressed_texture_pvrtc') || gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc');
                if (this.pvrtc) {
                    this.pvrtc.name = 'WEBGL_compressed_texture_pvrtc';
                }
                //
                this.etc1 = gl.getExtension('WEBGL_compressed_texture_etc1') || gl.getExtension('WEBKIT_WEBGL_compressed_texture_etc1');
                if (this.etc1) {
                    this.etc1.name = 'WEBGL_compressed_texture_etc1';
                }
                //
                this.etc2 = gl.getExtension('WEBGL_compressed_texture_etc') || gl.getExtension('WEBKIT_WEBGL_compressed_texture_etc');
                if (this.etc2) {
                    this.etc2.name = 'WEBGL_compressed_texture_etc';
                }
                //
                this.s3tc = gl.getExtension('WEBGL_compressed_texture_s3tc') || gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc');
                if (this.s3tc) {
                    this.s3tc.name = 'WEBGL_compressed_texture_s3tc';
                }
                this.astc = gl.getExtension('WEBGL_compressed_texture_astc') || gl.getExtension('WEBKIT_WEBGL_compressed_texture_astc');
                if (this.astc) {
                    this.astc.name = 'WEBGL_compressed_texture_astc';
                }
                this.bptc = gl.getExtension("EXT_texture_compression_bptc") || gl.getExtension("WEBKIT_EXT_texture_compression_bptc");
                if (this.bptc) {
                    this.bptc.name = 'EXT_texture_compression_bptc';
                }
                if (egret.Capabilities._supportedCompressedTexture) {
                    egret.Capabilities._supportedCompressedTexture = egret.Capabilities._supportedCompressedTexture || {};
                    egret.Capabilities._supportedCompressedTexture.pvrtc = !!this.pvrtc;
                    egret.Capabilities._supportedCompressedTexture.etc1 = !!this.etc1;
                    egret.Capabilities._supportedCompressedTexture.etc2 = !!this.etc2;
                    egret.Capabilities._supportedCompressedTexture.s3tc = !!this.s3tc;
                    egret.Capabilities._supportedCompressedTexture.astc = !!this.astc;
                    egret.Capabilities._supportedCompressedTexture.bptc = !!this.bptc;
                }
                else {
                    egret.Capabilities['supportedCompressedTexture'] = egret.Capabilities._supportedCompressedTexture || {};
                    egret.Capabilities['supportedCompressedTexture'].pvrtc = !!this.pvrtc;
                    egret.Capabilities['supportedCompressedTexture'].etc1 = !!this.etc1;
                    egret.Capabilities['supportedCompressedTexture'].etc2 = !!this.etc2;
                    egret.Capabilities['supportedCompressedTexture'].s3tc = !!this.s3tc;
                    egret.Capabilities['supportedCompressedTexture'].astc = !!this.astc;
                    egret.Capabilities['supportedCompressedTexture'].bptc = !!this.bptc;
                }
                //
                this._supportedCompressedTextureInfo = this._buildSupportedCompressedTextureInfo(/*this.context, compressedTextureExNames,*/ [this.etc1, this.pvrtc, this.etc2, this.bptc, this.s3tc, this.astc]);
            };
            WebGLRenderContext.prototype.handleContextLost = function () {
                this.contextLost = true;
                egret.sys.isContextLost = true;
                //记录webgl上下文丢失日志
                egret.sys.$TempStage && egret.sys.$TempStage.dispatchEvent(new egret.Event(egret.Event.ERROR, false, false, {
                    message: "handleContextLost",
                    stack: "handleContextLost",
                    errType: "SCRIPT_WARN",
                }));
                egret.sys.$TempStage && egret.sys.$TempStage.dispatchEvent(new egret.Event(egret.Event.WEBGL_CONTEXT_LOST, false, false));
            };
            WebGLRenderContext.prototype.handleContextRestored = function () {
                this.initWebGL();
                this.contextLost = false;
                egret.sys.isContextLost = false;
                //记录webgl上下文恢复日志
                egret.sys.$TempStage && egret.sys.$TempStage.dispatchEvent(new egret.Event(egret.Event.ERROR, false, false, {
                    message: "handleContextRestored",
                    stack: "handleContextRestored",
                }));
            };
            WebGLRenderContext.prototype.getWebGLContext = function () {
                /*
                let options = {
                    antialias: WebGLRenderContext.antialias,
                    stencil: true//设置可以使用模板（用于不规则遮罩）
                };
                let gl: any;
                //todo 是否使用chrome源码names
                //let contextNames = ["moz-webgl", "webkit-3d", "experimental-webgl", "webgl", "3d"];
                let names = ["webgl", "experimental-webgl"];
                for (let i = 0; i < names.length; i++) {
                    try {
                        gl = this.surface.getContext(names[i], options);
                    } catch (e) {
                    }
                    if (gl) {
                        break;
                    }
                }
                if (!gl) {
                    $error(1021);
                }
                */
                var gl = egret.sys.getContextWebGL(this.surface);
                this.setContext(gl);
                return gl;
            };
            WebGLRenderContext.prototype.setContext = function (gl) {
                this.context = gl;
                gl.id = WebGLRenderContext.glContextId++;
                this.glID = gl.id;
                gl.disable(gl.DEPTH_TEST);
                gl.disable(gl.CULL_FACE);
                gl.enable(gl.BLEND);
                gl.colorMask(true, true, true, true);
                // 目前只使用0号材质单元，默认开启
                gl.activeTexture(gl.TEXTURE0);
            };
            /**
             * 开启模版检测
             */
            WebGLRenderContext.prototype.enableStencilTest = function () {
                var gl = this.context;
                gl.enable(gl.STENCIL_TEST);
            };
            /**
             * 关闭模版检测
             */
            WebGLRenderContext.prototype.disableStencilTest = function () {
                var gl = this.context;
                gl.disable(gl.STENCIL_TEST);
            };
            /**
             * 开启scissor检测
             */
            WebGLRenderContext.prototype.enableScissorTest = function (rect) {
                var gl = this.context;
                gl.enable(gl.SCISSOR_TEST);
                gl.scissor(rect.x, rect.y, rect.width, rect.height);
            };
            /**
             * 关闭scissor检测
             */
            WebGLRenderContext.prototype.disableScissorTest = function () {
                var gl = this.context;
                gl.disable(gl.SCISSOR_TEST);
            };
            /**
             * 获取像素信息
             */
            WebGLRenderContext.prototype.getPixels = function (x, y, width, height, pixels) {
                var gl = this.context;
                gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            };
            /**
             * 创建一个WebGLTexture
             */
            WebGLRenderContext.prototype.createTexture = function (bitmapData, batch, premultiplyAlpha, glFormat, type) {
                if (batch === void 0) { batch = true; }
                if (!bitmapData) {
                    return null;
                }
                if ("type" in bitmapData && bitmapData["type"] === "ArrayBuffer") {
                    return egret.sys._createTexture(this, bitmapData.width, bitmapData.height, new Uint8Array(bitmapData.data), premultiplyAlpha, glFormat, type);
                }
                else {
                    if (egret.sys.openAutoBatch && batch) {
                        //先尝试加入Atlas,失败就直接创建
                        var tex = web.TextureAtlasManager.createTexture(this, bitmapData);
                        if (!tex) {
                            tex = egret.sys.createTexture(this, bitmapData, premultiplyAlpha, glFormat, type);
                        }
                        return tex;
                    }
                    return egret.sys.createTexture(this, bitmapData, premultiplyAlpha, glFormat, type);
                }
            };
            /*
            * TO DO
            */
            WebGLRenderContext.prototype.checkCompressedTextureInternalFormat = function (supportedCompressedTextureInfo, internalFormat) {
                if (!egret.sys.checkCompressTextureInternalFormat) {
                    //不检查纹理颜色internal format，主要处理一些特殊情况比如SB微信在android底下ASTC扩展返回唯独不包含6X6,其他正常
                    return true;
                }
                //width: number, height: number max ?
                for (var i = 0, length_3 = supportedCompressedTextureInfo.length; i < length_3; ++i) {
                    var ss = supportedCompressedTextureInfo[i];
                    // const formats = ss._COMPRESSED_TEXTURE_FORMATS_;
                    // for (let j = 0, length = formats.length; j < length; ++j) {
                    //     if (formats[j] === internalFormat) {
                    //         return true;
                    //     }
                    // }
                    var supportedFormats = ss.supportedFormats;
                    for (var j = 0, length_4 = supportedFormats.length; j < length_4; ++j) {
                        if (supportedFormats[j][1] === internalFormat) {
                            return true;
                        }
                    }
                }
                return false;
            };
            /*
            * TO DO
            */
            WebGLRenderContext.prototype.$debugLogCompressedTextureNotSupported = function (supportedCompressedTextureInfo, internalFormat) {
                if (!debugLogCompressedTextureNotSupported[internalFormat]) {
                    debugLogCompressedTextureNotSupported[internalFormat] = true;
                    egret.log('internalFormat = ' + internalFormat + ':' + ('0x' + internalFormat.toString(16)) + ', the current hardware does not support the corresponding compression format.');
                    for (var i = 0, length_5 = supportedCompressedTextureInfo.length; i < length_5; ++i) {
                        var ss = supportedCompressedTextureInfo[i];
                        if (ss.supportedFormats.length > 0) {
                            egret.log('support = ' + ss.extensionName);
                            for (var j = 0, length_6 = ss.supportedFormats.length; j < length_6; ++j) {
                                var tp = ss.supportedFormats[j];
                                egret.log(tp[0] + ' : ' + tp[1] + ' : ' + ('0x' + tp[1].toString(16)));
                            }
                        }
                    }
                }
            };
            /**
             * 创建压缩纹理
             * @param data
             * @param width
             * @param height
             * @param levels
             * @param internalFormat
             * @returns
             */
            WebGLRenderContext.prototype.createCompressedTexture = function (data, width, height, levels, internalFormat, premultiplyAlpha) {
                if (premultiplyAlpha === void 0) { premultiplyAlpha = true; }
                var checkSupported = this.checkCompressedTextureInternalFormat(this._supportedCompressedTextureInfo, internalFormat);
                if (!checkSupported) {
                    this.$debugLogCompressedTextureNotSupported(this._supportedCompressedTextureInfo, internalFormat);
                    return this.defaultEmptyTexture;
                }
                var texture = egret.sys.createCompressedTexture(this, data, width, height, levels, internalFormat, premultiplyAlpha);
                if (!texture) {
                    return this.defaultEmptyTexture;
                }
                return texture;
                // ///
                // const gl: any = this.context;
                // const texture = gl.createTexture() as WebGLTexture;
                // if (!texture) {
                //     this.contextLost = true;
                //     return;
                // }
                // texture[glContext] = gl;
                // texture[is_compressed_texture] = true;
                // gl.bindTexture(gl.TEXTURE_2D, texture);
                // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
                // texture[UNPACK_PREMULTIPLY_ALPHA_WEBGL] = true;
                // gl.compressedTexImage2D(gl.TEXTURE_2D, levels, internalFormat, width, height, 0, data);
                // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                // gl.bindTexture(gl.TEXTURE_2D, null);
                // return texture;
            };
            /**
             * 更新材质的bitmapData
             */
            WebGLRenderContext.prototype.updateTexture = function (texture, bitmapData, premultiplyAlpha, format, type) {
                egret.sys.updateTexture(this, texture, bitmapData, premultiplyAlpha, format, type);
                // let gl: any = this.context;
                // gl.bindTexture(gl.TEXTURE_2D, texture);
                // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
                // gl.texImage2D(gl.TEXTURE_2D, 0, gl[glFormat], gl[glFormat], gl[type], bitmapData);
            };
            Object.defineProperty(WebGLRenderContext.prototype, "defaultEmptyTexture", {
                get: function () {
                    if (!this._defaultEmptyTexture) {
                        var size = 16;
                        var canvas = egret.sys.createCanvas(size, size);
                        var context = egret.sys.getContext2d(canvas); //canvas.getContext('2d');
                        context.fillStyle = 'white';
                        context.fillRect(0, 0, size, size);
                        if (egret.sys.profileWebGLTexture) {
                            canvas["userdata"] = { "url": "canvas" };
                        }
                        this._defaultEmptyTexture = this.createTexture(canvas);
                        this._defaultEmptyTexture && (this._defaultEmptyTexture[egret.engine_default_empty_texture] = true);
                    }
                    return this._defaultEmptyTexture;
                },
                enumerable: true,
                configurable: true
            });
            WebGLRenderContext.prototype.getWebGLTexture = function (bitmapData) {
                if (!bitmapData.webGLTexture && bitmapData.valid()) {
                    if (bitmapData.format == "image" && !bitmapData.hasCompressed2d()) {
                        if (egret.sys.profileWebGLTexture) {
                            bitmapData.source.userdata = { "url": bitmapData.url };
                        }
                        bitmapData.webGLTexture = this.createTexture(bitmapData.source, bitmapData.batchType === egret.BatchType.Batch, bitmapData.premultiplyAlpha);
                        if (bitmapData.webGLTexture) {
                            ///
                            bitmapData.webGLTexture["alphaMode"] = 0;
                            var etcAlphaMask = bitmapData.etcAlphaMask;
                            if (etcAlphaMask) {
                                var maskTexture = this.getWebGLTexture(etcAlphaMask);
                                if (maskTexture) {
                                    bitmapData.webGLTexture[egret.etc_alpha_mask] = maskTexture;
                                    bitmapData.webGLTexture["alphaMode"] = 1;
                                }
                            }
                            bitmapData.webGLTexture[egret.vertical_alpha_mask] = bitmapData.verticalAlphaMask;
                            bitmapData.webGLTexture[egret.horizontal_alpha_mask] = bitmapData.horizontalAlphaMask;
                            if (bitmapData.verticalAlphaMask) {
                                bitmapData.webGLTexture["alphaMode"] = 2;
                            }
                            else if (bitmapData.horizontalAlphaMask) {
                                bitmapData.webGLTexture["alphaMode"] = 3;
                            }
                        }
                    }
                    else if (bitmapData.hasCompressed2d()) {
                        var compressedData = bitmapData.getCompressed2dTextureData();
                        bitmapData.webGLTexture = this.createCompressedTexture(compressedData.byteArray, compressedData.width, compressedData.height, compressedData.level, compressedData.glInternalFormat, bitmapData.premultiplyAlpha);
                        ///
                        if (bitmapData.webGLTexture) {
                            bitmapData.webGLTexture["alphaMode"] = 0;
                            var etcAlphaMask = bitmapData.etcAlphaMask;
                            if (etcAlphaMask) {
                                var maskTexture = this.getWebGLTexture(etcAlphaMask);
                                if (maskTexture) {
                                    bitmapData.webGLTexture[egret.etc_alpha_mask] = maskTexture;
                                    bitmapData.webGLTexture["alphaMode"] = 1;
                                }
                            }
                            bitmapData.webGLTexture[egret.vertical_alpha_mask] = bitmapData.verticalAlphaMask;
                            bitmapData.webGLTexture[egret.horizontal_alpha_mask] = bitmapData.horizontalAlphaMask;
                            if (bitmapData.verticalAlphaMask) {
                                bitmapData.webGLTexture["alphaMode"] = 2;
                            }
                            else if (bitmapData.horizontalAlphaMask) {
                                bitmapData.webGLTexture["alphaMode"] = 3;
                            }
                        }
                    }
                    if (bitmapData.$deleteSource && bitmapData.webGLTexture) {
                        if (bitmapData.source) {
                            // WeChat Memory leakage bug
                            bitmapData.source.src = '';
                            bitmapData.source = null;
                        }
                        bitmapData.clearCompressedTextureData();
                    }
                    if (bitmapData.webGLTexture) {
                        //todo 默认值
                        bitmapData.webGLTexture["smoothing"] = true;
                        if (bitmapData.webGLTexture["alphaMode"] === undefined) {
                            bitmapData.webGLTexture["alphaMode"] = 0;
                        }
                    }
                }
                return bitmapData.webGLTexture;
            };
            /**
             * 清除矩形区域
             */
            WebGLRenderContext.prototype.clearRect = function (x, y, width, height) {
                if (x != 0 || y != 0 || width != this.surface.width || height != this.surface.height) {
                    var buffer = this.currentBuffer;
                    if (buffer.$hasScissor) {
                        this.setGlobalCompositeOperation("destination-out");
                        this.drawRect(x, y, width, height);
                        this.setGlobalCompositeOperation("source-over");
                    }
                    else {
                        var m = buffer.globalMatrix;
                        if (m.b == 0 && m.c == 0) {
                            x = x * m.a + m.tx;
                            y = y * m.d + m.ty;
                            width = width * m.a;
                            height = height * m.d;
                            this.enableScissor(x, -y - height + buffer.height, width, height);
                            this.clear();
                            this.disableScissor();
                        }
                        else {
                            this.setGlobalCompositeOperation("destination-out");
                            this.drawRect(x, y, width, height);
                            this.setGlobalCompositeOperation("source-over");
                        }
                    }
                }
                else {
                    this.clear();
                }
            };
            /**
             * 设置混色
             */
            WebGLRenderContext.prototype.setGlobalCompositeOperation = function (value) {
                if (this.currentBlendMode != value) {
                    this.drawCmdManager.pushSetBlend(value);
                    this.currentBlendMode = value;
                }
            };
            /**图片后渲染 */
            WebGLRenderContext.prototype.drawImageLastRender = function (renderData) {
                var buffer = renderData.buffer;
                var image = renderData.image;
                if (!image.source && !image.webGLTexture) {
                    return false;
                }
                var texture;
                if (image.source) {
                    if (image.source["uriValue"] != image.uriValue) {
                        image.source["uriValue"] = image.uriValue;
                    }
                }
                texture = this.getWebGLTexture(image);
                if (!texture) {
                    return false;
                }
                var depthMasks = renderData.depthMasks;
                var batchType = depthMasks ? egret.BatchType.Disable : image.batchType;
                return this.drawTextureLastRender(buffer, texture, renderData, batchType);
            };
            /**文本后渲染 */
            WebGLRenderContext.prototype.drawTextLastRender = function (renderData, meshUVs, meshVertices, meshIndices, bounds) {
                var buffer = renderData.buffer;
                var texture = renderData.texture;
                return this.drawTextureLastRender(buffer, texture, renderData);
            };
            WebGLRenderContext.prototype.drawTextureLastRender = function (buffer, texture, renderData, batchType, meshUVs, meshVertices, meshIndices, bounds) {
                if (this.contextLost || !texture || !buffer) {
                    return false;
                }
                var smoothing = renderData.smoothing;
                var rotated = renderData.rotated;
                var count;
                if (web.isIOS14Device()) {
                    var meshNum = meshIndices && (meshIndices.length / 3) || 0;
                    if (meshIndices) {
                        if (this.vao.reachMaxSize(meshNum * 4, meshNum * 6)) {
                            this.$drawWebGL();
                        }
                    }
                    else {
                        if (this.vao.reachMaxSize()) {
                            this.$drawWebGL();
                        }
                    }
                    count = meshIndices ? meshNum * 2 : 2;
                }
                else {
                    if (meshVertices && meshIndices) {
                        if (this.vao.reachMaxSize(meshVertices.length / 2, meshIndices.length)) {
                            this.$drawWebGL();
                        }
                    }
                    else {
                        if (this.vao.reachMaxSize()) {
                            this.$drawWebGL();
                        }
                    }
                    if (smoothing != undefined && texture["smoothing"] != smoothing) {
                        this.drawCmdManager.pushChangeSmoothing(texture, smoothing);
                    }
                    if (meshUVs) {
                        this.vao.changeToMeshIndices();
                    }
                    count = meshIndices ? meshIndices.length / 3 : 2;
                }
                this.drawCmdManager.pushDrawTexture(texture, count, this.$filter, renderData.textureWidth, renderData.textureHeight, buffer, batchType, renderData.depthMasks, renderData.hierarchy);
                buffer.currentTexture = texture;
                this.vao.cacheLastRenderArrays(renderData.globalTiniColor, buffer.currentTexture, renderData.globalAlpha, renderData.globalMatrix, renderData.offsetX, renderData.offsetY, renderData.sourceX, renderData.sourceY, renderData.sourceWidth, renderData.sourceHeight, renderData.destX, renderData.destY, renderData.destWidth, renderData.destHeight, renderData.textureWidth, renderData.textureHeight, meshUVs, meshVertices, meshIndices, rotated);
                return true;
            };
            /**
             * 绘制图片，image参数可以是BitmapData或者renderTarget
             */
            WebGLRenderContext.prototype.drawImage = function (image, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, imageSourceWidth, imageSourceHeight, rotated, smoothing, depthMasks, hierarchy) {
                var buffer = this.currentBuffer;
                if (this.contextLost || !image || !buffer) {
                    return false;
                }
                var texture;
                var offsetX;
                var offsetY;
                if (image["texture"] || (image.source && image.source["texture"])) {
                    // 如果是render target
                    texture = image["texture"] || image.source["texture"];
                    buffer.saveTransform();
                    offsetX = buffer.$offsetX;
                    offsetY = buffer.$offsetY;
                    buffer.useOffset();
                    buffer.transform(1, 0, 0, -1, 0, destHeight + destY * 2); // 翻转
                }
                else if (!image.source && !image.webGLTexture) {
                    return false;
                }
                else {
                    if (image.source) {
                        if (image.source["uriValue"] != image.uriValue) {
                            image.source["uriValue"] = image.uriValue;
                        }
                    }
                    texture = this.getWebGLTexture(image);
                }
                if (!texture) {
                    return false;
                }
                if (texture["atlasTexture"] === true) {
                    if (image.isAtlas === true) {
                        //是合图本身，不需要修正sourceX,sourceY,textureWidth,textureHeight
                    }
                    else {
                        //激活Atlas中对应图片
                        web.TextureAtlasManager.activeTexture(image.uriValue);
                        //如果是自动合图图片，需要修改数据
                        imageSourceWidth = texture["textureWidth"];
                        imageSourceHeight = texture["textureHeight"];
                        sourceX = texture["textureSourceX"] + sourceX;
                        sourceY = texture["textureSourceY"] + sourceY;
                    }
                }
                var batchType = depthMasks ? egret.BatchType.Disable : image.batchType;
                var bBatchSuccess = this.drawTexture(texture, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, imageSourceWidth, imageSourceHeight, undefined, undefined, undefined, undefined, rotated, smoothing, batchType, depthMasks, hierarchy);
                if (bBatchSuccess) {
                    return false;
                }
                if (image.source && image.source["texture"]) {
                    buffer.$offsetX = offsetX;
                    buffer.$offsetY = offsetY;
                    buffer.restoreTransform();
                }
                return true;
            };
            /**
             * 绘制Mesh
             */
            WebGLRenderContext.prototype.drawMesh = function (image, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, imageSourceWidth, imageSourceHeight, meshUVs, meshVertices, meshIndices, bounds, rotated, smoothing, colors) {
                var buffer = this.currentBuffer;
                if (this.contextLost || !image || !buffer) {
                    return;
                }
                var texture;
                var offsetX;
                var offsetY;
                if (image["texture"] || (image.source && image.source["texture"])) {
                    // 如果是render target
                    texture = image["texture"] || image.source["texture"];
                    buffer.saveTransform();
                    offsetX = buffer.$offsetX;
                    offsetY = buffer.$offsetY;
                    buffer.useOffset();
                    buffer.transform(1, 0, 0, -1, 0, destHeight + destY * 2); // 翻转
                }
                else if (!image.source && !image.webGLTexture) {
                    return;
                }
                else {
                    texture = this.getWebGLTexture(image);
                }
                if (!texture) {
                    return;
                }
                this.drawTexture(texture, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, imageSourceWidth, imageSourceHeight, meshUVs, meshVertices, meshIndices, bounds, rotated, smoothing, image.batchType, undefined, undefined, colors);
                if (image["texture"] || (image.source && image.source["texture"])) {
                    buffer.$offsetX = offsetX;
                    buffer.$offsetY = offsetY;
                    buffer.restoreTransform();
                }
            };
            /**
             * 绘制材质
             */
            WebGLRenderContext.prototype.drawTexture = function (texture, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureWidth, textureHeight, meshUVs, meshVertices, meshIndices, bounds, rotated, smoothing, batchType, depthMasks, hierarchy, colors) {
                var _this = this;
                var buffer = this.currentBuffer;
                if (this.contextLost || !texture || !buffer) {
                    return false;
                }
                var count;
                if (web.isIOS14Device()) {
                    var meshNum = meshIndices && (meshIndices.length / 3) || 0;
                    if (meshIndices) {
                        if (this.vao.reachMaxSize(meshNum * 4, meshNum * 6)) {
                            this.$drawWebGL();
                        }
                    }
                    else {
                        if (this.vao.reachMaxSize()) {
                            this.$drawWebGL();
                        }
                    }
                    count = meshIndices ? meshNum * 2 : 2;
                }
                else {
                    if (meshVertices && meshIndices) {
                        if (this.vao.reachMaxSize(meshVertices.length / 2, meshIndices.length)) {
                            this.$drawWebGL();
                        }
                    }
                    else {
                        if (this.vao.reachMaxSize()) {
                            this.$drawWebGL();
                        }
                    }
                    if (smoothing != undefined && texture["smoothing"] != smoothing) {
                        this.drawCmdManager.pushChangeSmoothing(texture, smoothing);
                    }
                    if (meshUVs) {
                        this.vao.changeToMeshIndices();
                    }
                    count = meshIndices ? meshIndices.length / 3 : 2;
                }
                // 应用$filter，因为只可能是colorMatrixFilter，最后两个参数可不传
                this.drawCmdManager.pushDrawTexture(texture, count, this.$filter, textureWidth, textureHeight, buffer, batchType, depthMasks, hierarchy);
                buffer.currentTexture = texture;
                this.vao.cacheArrays(buffer, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureWidth, textureHeight, meshUVs, meshVertices, meshIndices, rotated, colors);
                var bBatchSuccess = false;
                if (egret.sys.openBatchTextureCmd) {
                    //尝试合批 by zgj 2020.8.5
                    if (batchType === egret.BatchType.Disable || batchType === egret.BatchType.Ignore || batchType === egret.BatchType.IgnoreSelf) {
                        return false;
                    }
                    //autoBatch:找到cmd插入位置(cmd和buffer)
                    if (this.drawCmdManager.drawDataLen < 4) {
                        return false;
                    }
                    var vaoVertices_1 = this.vao.getVertices();
                    //命令insert位置
                    var cmdInsertIdx = this.drawCmdManager.drawDataLen - 1;
                    //保存最初位置
                    var saveLastestTextureIdx = cmdInsertIdx;
                    var vaoVertSize = this.vao.vertSize;
                    var vaoQuadVertexSize_1 = this.vao.quadVertexSize;
                    var vaoIndicesSize = this.vao.quadIndicesSize;
                    var lastestTextureData = this.drawCmdManager.drawData[cmdInsertIdx];
                    //顶点数据insert位置
                    var vaoVertexInsertIdx_1 = this.vao.getVertexDataSize() - lastestTextureData.count / 2 * vaoQuadVertexSize_1;
                    //顶点索引insert位置
                    // let vaoIndicasInsertIdx = this.vao.getIndicesCount() - 6 * lastestTextureData.count/2;
                    var rect1_1 = egret.Rectangle.create();
                    this.vao.getTextureAABB(vaoVertexInsertIdx_1, rect1_1, vaoVertices_1);
                    var checkRect_1 = egret.Rectangle.create();
                    var _loop_1 = function (j) {
                        var data = this_1.drawCmdManager.drawData[j];
                        if (data.type == 1 /* RECT */ || data.type == 0 /* TEXTURE */) {
                            //data.count表示三角形数量
                            var quadCount_1 = data.count / 2;
                            vaoVertexInsertIdx_1 -= quadCount_1 * vaoQuadVertexSize_1;
                            // vaoIndicasInsertIdx -= quadCount * vaoIndicesSize;
                            if (data.batchType === egret.BatchType.Disable) {
                                return "break";
                            }
                            if (data.batchType === egret.BatchType.Ignore) {
                                return "continue";
                            }
                            //先只考虑Texture合批
                            if (data.type == 0 /* TEXTURE */) {
                                var isIntersects = function () {
                                    for (var i = 0; i < quadCount_1; i++) {
                                        //获取对应quad在世界坐标下的AABB包围盒与待加入的quad比较
                                        var AABBhit = false;
                                        //do AABB collison test
                                        _this.vao.getTextureAABB(vaoVertexInsertIdx_1 + vaoQuadVertexSize_1 * i, checkRect_1, vaoVertices_1);
                                        //AABB测试
                                        AABBhit = rect1_1.intersects(checkRect_1);
                                        //如果遇到AABB测试有碰撞表示不能修改渲染顺序
                                        if (AABBhit) {
                                            return true;
                                        }
                                    }
                                    return false;
                                };
                                if (data.texture != texture) {
                                    //遇到不一样Texture
                                    if (isIntersects()) {
                                        return "break";
                                    }
                                }
                                else {
                                    //如果texture相同，但是filter不同，也不能合批（使用图集时，可能导致层级错乱问题）
                                    if (!!this_1.$filter != !!data.filter) {
                                        if (isIntersects()) {
                                            return "break";
                                        }
                                    }
                                    if ((!this_1.$filter && !data.filter) || (data.filter && this_1.$filter && data.filter.type == this_1.$filter.type)) { //都没有filter或者filter一致
                                        if (data.filter && this_1.$filter && data.filter.type === "colorTransform" && this_1.$filter.type === "colorTransform") {
                                            //修改颜色的filter
                                            if (data.filter.$toJson() == this_1.$filter.$toJson()) {
                                                //当矩阵相同才可以同一个批次渲染
                                                cmdInsertIdx = j;
                                                return "break";
                                            }
                                        }
                                        else {
                                            //遇到相同图片表示可以insert到该drawTexture的后面
                                            cmdInsertIdx = j;
                                            return "break";
                                        }
                                    }
                                    //TODO-对于不能使用一个Draw的，只调整顺序不合并，有利于提高贴图命中率，减少带宽
                                }
                            }
                        }
                        else if (data.type == 16 /* ENABLE_SCISSOR */ || data.type == 17 /* DISABLE_SCISSOR */
                            || (data.type > 2 /* MASK_OP_START */ && data.type < 11 /* MASK_OP_END */) //TODO-其实可以把所有不支持合批的指令都改成这种形式的比较
                            || data.type == 14 /* CLEAR_COLOR */ || data.type == 12 /* BLEND */
                            || data.type == 15 /* ACT_BUFFER */) {
                            return "break";
                        }
                        else if (data.type == 19 /* IGNORE */ || data.type == 18 /* SMOOTHING */ || data.type == 13 /* RESIZE_TARGET */) {
                            return "continue";
                        }
                        else {
                            return "break";
                        }
                    };
                    var this_1 = this;
                    for (var j = cmdInsertIdx - 1; j > 1; j--) {
                        var state_1 = _loop_1(j);
                        if (state_1 === "break")
                            break;
                    }
                    //找到可以插入的新位置
                    if (cmdInsertIdx != saveLastestTextureIdx) {
                        var batchArraySuccess = false;
                        //先调整buffer，因为调整cmd会获取到错误数据
                        batchArraySuccess = this.vao.batchArrays(vaoVertexInsertIdx_1 + vaoQuadVertexSize_1 * this.drawCmdManager.drawData[cmdInsertIdx].count / 2);
                        //调整cmd
                        if (batchArraySuccess) {
                            this.drawCmdManager.batchDrawTexture(cmdInsertIdx);
                            bBatchSuccess = true;
                        }
                    }
                    egret.Rectangle.release(rect1_1);
                    egret.Rectangle.release(checkRect_1);
                }
                return bBatchSuccess;
            };
            /**
             * 绘制矩形（仅用于遮罩擦除等）
             */
            WebGLRenderContext.prototype.drawRect = function (x, y, width, height) {
                var buffer = this.currentBuffer;
                if (this.contextLost || !buffer) {
                    return;
                }
                if (this.vao.reachMaxSize()) {
                    this.$drawWebGL();
                }
                this.drawCmdManager.pushDrawRect();
                buffer.currentTexture = null;
                this.vao.cacheArrays(buffer, 0, 0, width, height, x, y, width, height, width, height);
            };
            WebGLRenderContext.prototype.drawSdfRect = function (x, y, width, height, color, alpha) {
                var buffer = this.currentBuffer;
                if (this.contextLost || !buffer) {
                    return;
                }
                if (this.vao.reachMaxSize()) {
                    this.$drawWebGL();
                }
                this.drawCmdManager.pushDrawSdfRect(color, alpha);
                buffer.currentTexture = null;
                this.vao.cacheArrays(buffer, 0, 0, width, height, x, y, width, height, width, height);
            };
            /**
             * 绘制遮罩
             */
            WebGLRenderContext.prototype.pushMask = function (x, y, width, height) {
                var buffer = this.currentBuffer;
                if (this.contextLost || !buffer) {
                    return;
                }
                buffer.$stencilList.push({ x: x, y: y, width: width, height: height });
                if (this.vao.reachMaxSize()) {
                    this.$drawWebGL();
                }
                this.drawCmdManager.pushPushMask();
                buffer.currentTexture = null;
                this.vao.cacheArrays(buffer, 0, 0, width, height, x, y, width, height, width, height);
            };
            WebGLRenderContext.prototype.pushMaskTex = function (texture, mat, uv2Clamp, allowUV2Clamp, buffer) {
                this.drawCmdManager.pushPushMaskTex(texture, mat, uv2Clamp, allowUV2Clamp, buffer);
            };
            WebGLRenderContext.prototype.popMaskTex = function () {
                this.drawCmdManager.pushPopMaskTex();
            };
            WebGLRenderContext.prototype.pushStencilMaskBegin = function () {
                this.drawCmdManager.pushPushStencilMaskBegin();
            };
            WebGLRenderContext.prototype.pushStencilMaskEnd = function () {
                this.drawCmdManager.pushPushStencilMaskEnd();
            };
            WebGLRenderContext.prototype.popStencilMaskBegin = function () {
                this.drawCmdManager.pushPopStencilMaskBegin();
            };
            WebGLRenderContext.prototype.popStencilMaskEnd = function () {
                this.drawCmdManager.pushPopStencilMaskEnd();
            };
            /**
             * 恢复遮罩
             */
            WebGLRenderContext.prototype.popMask = function () {
                var buffer = this.currentBuffer;
                if (this.contextLost || !buffer) {
                    return;
                }
                var mask = buffer.$stencilList.pop();
                if (this.vao.reachMaxSize()) {
                    this.$drawWebGL();
                }
                this.drawCmdManager.pushPopMask();
                buffer.currentTexture = null;
                this.vao.cacheArrays(buffer, 0, 0, mask.width, mask.height, mask.x, mask.y, mask.width, mask.height, mask.width, mask.height);
            };
            /**
             * 清除颜色缓存
             */
            WebGLRenderContext.prototype.clear = function () {
                this.drawCmdManager.pushClearColor();
            };
            /**
             * 开启scissor test
             */
            WebGLRenderContext.prototype.enableScissor = function (x, y, width, height) {
                var buffer = this.currentBuffer;
                this.drawCmdManager.pushEnableScissor(x, y, width, height);
                buffer.$hasScissor = true;
            };
            /**
             * 关闭scissor test
             */
            WebGLRenderContext.prototype.disableScissor = function () {
                var buffer = this.currentBuffer;
                this.drawCmdManager.pushDisableScissor();
                buffer.$hasScissor = false;
            };
            WebGLRenderContext.prototype.$drawWebGL = function () {
                if (this.drawCmdManager.drawDataLen == 0 || this.contextLost) {
                    return;
                }
                var indices = this.vao.getIndices();
                var vertices = this.vao.getVertices();
                if (!web.isIOS14Device()) {
                    this.uploadVerticesArray(vertices);
                }
                // 有mesh，则使用indicesForMesh
                if (this.vao.isMesh()) {
                    this.uploadIndicesArray(this.vao.getMeshIndices());
                }
                var length = this.drawCmdManager.drawDataLen;
                var offset = 0;
                var recordData = { setPassCalls: 0 };
                for (var i = 0; i < length; i++) {
                    var data = this.drawCmdManager.drawData[i];
                    var isDrawCall = data.type == 0 /* TEXTURE */ || data.type == 1 /* RECT */ || data.type == 3 /* PUSH_MASK */ || data.type == 7 /* POP_MASK */ || data.type == 20 /* SDF_RECT */;
                    if (web.isIOS14Device() && !this.vao.isMesh() && isDrawCall) {
                        this.uploadIndicesArray(indices.subarray(0, data.count * this.vertexCountPerTriangle));
                        this.uploadVerticesArray(this.vao.vertices.subarray(offset / this.vertexCountPerTriangle * this.triangleCountPerQuad * this.dataCountPerVertex, (offset + data.count * this.vertexCountPerTriangle) / this.vertexCountPerTriangle * this.triangleCountPerQuad * this.dataCountPerVertex));
                        this.drawData(data, 0, recordData);
                        offset += data.count * this.vertexCountPerTriangle;
                    }
                    else {
                        offset = this.drawData(data, offset, recordData);
                    }
                    // 计算draw call
                    if (data.type == 15 /* ACT_BUFFER */) {
                        this.activatedBuffer = data.buffer;
                    }
                    if (isDrawCall) {
                        if (this.activatedBuffer && this.activatedBuffer.$computeDrawCall) {
                            this.activatedBuffer.$drawCalls++;
                            /**
                             * 要在您的游戏中在屏幕上绘制对象，Unity 需要向图形 API 发出“Draw”命令。此操作本质上称为“绘制调用”。
                             * 但在此之前，Unity 还需要设置绘制此对象所需的所有 GPU 状态：网格、着色器、纹理、混合设置和其他着色器属性。
                             * 状态更改命令加上一个或多个绘制命令就是我们所说的批处理。
                             *
                             * 使批处理变慢的是 GPU 状态更改命令，而绘制命令实际上非常便宜。这就是 Unity 尝试将使用相同 GPU 状态渲染的多
                             * 个对象打包成一批的原因。这个过程称为批处理。
                             */
                            //当前最简单形式也是绑定不同贴图然后调用draw，相当于材质变换，因此基本上一次drawcall对应一次batch，后续如果出现一个batch多次draw，需要做相应修改
                            this.activatedBuffer.$drawBatches++;
                            //setPass Call可以理解为不同材质切换为一次setPass Call,当前只有单次pass，一次draw会切换一次材质
                            // this.activatedBuffer.$setPassCalls++;
                        }
                    }
                }
                if (this.activatedBuffer) {
                    this.activatedBuffer.$setPassCalls += recordData.setPassCalls;
                }
                // 切换回默认indices
                if (this.vao.isMesh()) {
                    this.uploadIndicesArray(this.vao.getIndices());
                }
                // 清空数据
                this.drawCmdManager.clear();
                this.vao.clear();
            };
            WebGLRenderContext.prototype.prepareShaderPrograms = function () {
                var gl = this.context;
                // colorTransform
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.colorTransform_frag, "colorTransform");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.colorTransform_frag_etc_alphamask_frag, "colorTransform_frag_etc_alphamask_frag");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.colorTransform_texture_vertical_alphamask_frag, "colorTransform_texture_vertical_alphamask_frag");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.colorTransform_texture_horizontal_alphamask_frag, "colorTransform_texture_horizontal_alphamask_frag");
                web.EgretWebGLProgram.groupPrograms(gl, "colorTransform", "colorTransform", "colorTransform_frag_etc_alphamask_frag", "colorTransform_texture_vertical_alphamask_frag", "colorTransform_texture_horizontal_alphamask_frag");
                // texture (default)
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.texture_frag, "texture");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.texture_etc_alphamask_frag, egret.etc_alpha_mask);
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.texture_vertical_alphamask_frag, egret.vertical_alpha_mask);
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.texture_horizontal_alphamask_frag, egret.horizontal_alpha_mask);
                web.EgretWebGLProgram.groupPrograms(gl, "texture", "texture", egret.etc_alpha_mask, egret.vertical_alpha_mask, egret.horizontal_alpha_mask);
                // textureSharpen
                if (egret.Capabilities.supportedDdxDdy) {
                    web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.texture_sharpen_frag, "textureSharpen");
                    web.EgretWebGLProgram.groupPrograms(gl, "textureSharpen", "textureSharpen", egret.etc_alpha_mask, egret.vertical_alpha_mask, egret.horizontal_alpha_mask);
                }
                else {
                    web.EgretWebGLProgram.groupPrograms(gl, "textureSharpen", "texture", egret.etc_alpha_mask, egret.vertical_alpha_mask, egret.horizontal_alpha_mask);
                }
                // texture_uv2
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.tex_uv2_vert, web.EgretShaderLib.tex_uv2_frag, "texture_uv2");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.tex_uv2_vert, web.EgretShaderLib.tex_uv2_sep_alphamask_frag, "tex_uv2_sep_alphamask");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.tex_uv2_vert, web.EgretShaderLib.tex_uv2_vertical_alphamask_frag, "tex_uv2_vertical_alphamask");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.tex_uv2_vert, web.EgretShaderLib.tex_uv2_horizontal_alphamask_frag, "tex_uv2_horizontal_alphamask");
                web.EgretWebGLProgram.groupPrograms(gl, "texture_uv2", "texture_uv2", "tex_uv2_sep_alphamask", "tex_uv2_vertical_alphamask", "tex_uv2_horizontal_alphamask");
                // texture_depthmask1
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask1_vert, web.EgretShaderLib.texture_depthmask1_frag, "texture_depthmask1");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask1_vert, web.EgretShaderLib.texture_depthmask1_sep_alphamask_frag, "texture_depthmask1_sep_alphamask");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask1_vert, web.EgretShaderLib.texture_depthmask1_vertical_alphamask_frag, "texture_depthmask1_vertical_alphamask");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask1_vert, web.EgretShaderLib.texture_depthmask1_horizontal_alphamask_frag, "texture_depthmask1_horizontal_alphamask");
                web.EgretWebGLProgram.groupPrograms(gl, "texture_depthmask1", "texture_depthmask1", "texture_depthmask1_sep_alphamask", "texture_depthmask1_vertical_alphamask", "texture_depthmask1_horizontal_alphamask");
                // texture_depthmask2
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask2_vert, web.EgretShaderLib.texture_depthmask2_frag, "texture_depthmask2");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask2_vert, web.EgretShaderLib.texture_depthmask2_sep_alphamask_frag, "texture_depthmask2_sep_alphamask");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask2_vert, web.EgretShaderLib.texture_depthmask2_vertical_alphamask_frag, "texture_depthmask2_vertical_alphamask");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask2_vert, web.EgretShaderLib.texture_depthmask2_horizontal_alphamask_frag, "texture_depthmask2_horizontal_alphamask");
                web.EgretWebGLProgram.groupPrograms(gl, "texture_depthmask2", "texture_depthmask2", "texture_depthmask2_sep_alphamask", "texture_depthmask2_vertical_alphamask", "texture_depthmask2_horizontal_alphamask");
                // texture_depthmask3
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask3_vert, web.EgretShaderLib.texture_depthmask3_frag, "texture_depthmask3");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask3_vert, web.EgretShaderLib.texture_depthmask3_sep_alphamask_frag, "texture_depthmask3_sep_alphamask");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask3_vert, web.EgretShaderLib.texture_depthmask3_vertical_alphamask_frag, "texture_depthmask3_vertical_alphamask");
                web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.texture_depthmask3_vert, web.EgretShaderLib.texture_depthmask3_horizontal_alphamask_frag, "texture_depthmask3_horizontal_alphamask");
                web.EgretWebGLProgram.groupPrograms(gl, "texture_depthmask3", "texture_depthmask3", "texture_depthmask3_sep_alphamask", "texture_depthmask3_vertical_alphamask", "texture_depthmask3_horizontal_alphamask");
                web.EgretWebGLProgram.defaultKey = "texture";
            };
            /**
             * 执行绘制命令
             */
            WebGLRenderContext.prototype.drawData = function (data, offset, recordData) {
                if (!data) {
                    return;
                }
                var gl = this.context;
                var program;
                var filter = data.filter;
                switch (data.type) {
                    case 0 /* TEXTURE */:
                        var depths = data.depthMasks;
                        var maskStack = this.$maskTextureStack;
                        var texture2 = null;
                        var texture2Mat = null;
                        var texture2AlphaMode = 0;
                        var uv2Clamp = void 0;
                        var allowUV2Clamp = true;
                        var paramdict = {};
                        if (maskStack.length) {
                            var i = maskStack.length - 1;
                            if (maskStack[i].buffer === this.activatedBuffer) {
                                texture2 = maskStack[i].texture;
                                texture2Mat = maskStack[i].mat;
                                uv2Clamp = maskStack[i].uv2Clamp;
                                texture2AlphaMode = texture2["alphaMode"];
                                if (texture2[egret.etc_alpha_mask]) {
                                    texture2 = texture2[egret.etc_alpha_mask];
                                }
                                paramdict[sysMat1to2] = texture2Mat;
                                allowUV2Clamp = maskStack[i].allowUV2Clamp;
                                if (allowUV2Clamp) {
                                    paramdict[sysUVClamp] = uv2Clamp;
                                }
                            }
                        }
                        //这段的切换可以优化
                        if (filter) {
                            if (filter.type === "custom") {
                                if (texture2) {
                                    gl.activeTexture(gl.TEXTURE2);
                                    gl.bindTexture(gl.TEXTURE_2D, texture2);
                                    filter.$uniforms["sysAlphaMask"] = 1;
                                    var alphaMode_1 = data.texture["alphaMode"];
                                    filter.$uniforms["sysAlphaMaskWithR"] = 0;
                                    filter.$uniforms["sysAlphaMaskUVOffset"] = { x: 0.0, y: 0.0 };
                                    if (alphaMode_1) {
                                        filter.$uniforms["sysAlphaMaskWithR"] = 0;
                                        switch (alphaMode_1) {
                                            case 2: // verticalAlphaMask
                                                filter.$uniforms["sysAlphaMaskUVOffset"] = { x: 0, y: 0.5 };
                                                break;
                                            case 3: //horizontalAlphaMask
                                                filter.$uniforms["sysAlphaMaskUVOffset"] = { x: 0.5, y: 0.0 };
                                                break;
                                        }
                                    }
                                }
                                filter.bindTexture(this);
                                var alphaMode = data.texture["alphaMode"];
                                if (alphaMode === undefined) {
                                    alphaMode = 0;
                                }
                                filter.updateAlphaMacro(alphaMode);
                                program = web.EgretWebGLProgram.getProgram(gl, filter.$vertexSrc, filter.$fragmentSrc, filter.$shaderKey);
                            }
                            else if (filter.type === "colorTransform") {
                                var alphaMode = data.texture["alphaMode"];
                                if (alphaMode === undefined) {
                                    alphaMode = 0;
                                }
                                program = web.EgretWebGLProgram.getProgramByKey(gl, "colorTransform", alphaMode);
                                if (data.texture[egret.etc_alpha_mask]) {
                                    gl.activeTexture(gl.TEXTURE1);
                                    gl.bindTexture(gl.TEXTURE_2D, data.texture[egret.etc_alpha_mask]);
                                }
                            }
                            else if (filter.type === "blurX") {
                                program = web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.blur_frag, "blur");
                            }
                            else if (filter.type === "blurY") {
                                program = web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.blur_frag, "blur");
                            }
                            else if (filter.type === "glow") {
                                program = web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.glow_frag, "glow");
                            }
                        }
                        else {
                            var programKey = "texture";
                            paramdict["uEnableSharpen"] = false;
                            if (egret.sys.enableSharpenFilter) {
                                paramdict["uEnableSharpen"] = true;
                                programKey = "textureSharpen";
                            }
                            if (data.texture[egret.etc_alpha_mask]) {
                                gl.activeTexture(gl.TEXTURE1);
                                gl.bindTexture(gl.TEXTURE_2D, data.texture[egret.etc_alpha_mask]);
                            }
                            var alphaMode = data.texture["alphaMode"];
                            if (alphaMode === undefined) {
                                alphaMode = 0;
                            }
                            if (depths) {
                                var GLTEXs = [gl.TEXTURE2, gl.TEXTURE3, gl.TEXTURE4];
                                for (var i = 0; i < depths.length; i++) {
                                    var depthInfo = depths[i];
                                    gl.activeTexture(GLTEXs[i]);
                                    gl.bindTexture(gl.TEXTURE_2D, depthInfo.texture);
                                    paramdict["sysSamplerDepth" + i] = 2 + i;
                                    paramdict["sysDetphUVMat" + i] = depthInfo.uvInfo.to3x3ArrayTmp();
                                    var uvClamp = depthInfo.uvClamp;
                                    paramdict["sysDepthUVClamp" + i] = { x: uvClamp[0], y: uvClamp[1], z: uvClamp[2], w: uvClamp[3] };
                                }
                                switch (depths.length) {
                                    case 1:
                                        programKey = "texture_depthmask1";
                                        break;
                                    case 2:
                                        programKey = "texture_depthmask2";
                                        break;
                                    case 3:
                                        programKey = "texture_depthmask3";
                                        break;
                                    default:
                                        break;
                                }
                                data.depths = null; //减少引用释放内存，构造这个数组的地方自己缓存吧
                            }
                            else if (texture2) {
                                gl.activeTexture(gl.TEXTURE2);
                                gl.bindTexture(gl.TEXTURE_2D, texture2);
                                programKey = "texture_uv2";
                                if (!allowUV2Clamp) {
                                    programKey = "texture_uv2_forbid_clamp";
                                }
                                switch (texture2AlphaMode) {
                                    case 1: // seperateAlphaMask
                                        paramdict[sysSamplerMaskUVOffset] = { x: 0, y: 0, z: 1 };
                                        break;
                                    case 2: // verticalAlphaMask
                                        paramdict[sysSamplerMaskUVOffset] = { x: 0, y: 0.5, z: 1 };
                                        break;
                                    case 3: //horizontalAlphaMask
                                        paramdict[sysSamplerMaskUVOffset] = { x: 0.5, y: 0.0, z: 1 };
                                        break;
                                    default:
                                        paramdict[sysSamplerMaskUVOffset] = { x: 0, y: 0.0, z: 0 };
                                        break;
                                }
                            }
                            program = web.EgretWebGLProgram.getProgramByKey(gl, programKey, alphaMode);
                        }
                        var premultipliedAlpha = false;
                        if (!data.texture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL]) {
                            premultipliedAlpha = true;
                        }
                        if (program) {
                            this.activeProgram(gl, program);
                            this.syncUniforms(program, filter, data.textureWidth, data.textureHeight, premultipliedAlpha, paramdict);
                        }
                        else {
                            if (true) {
                                console.error("drawData DRAWABLE_TYPE.TEXTURE create program fail");
                            }
                        }
                        offset += this.drawTextureElements(data, offset);
                        break;
                    case 1 /* RECT */:
                        program = web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.primitive_frag, "primitive");
                        this.activeProgram(gl, program);
                        this.syncUniforms(program, filter, data.textureWidth, data.textureHeight);
                        offset += this.drawRectElements(data, offset);
                        break;
                    case 20 /* SDF_RECT */:
                        program = web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.sdf_rect_frag, "sdf_rect_frag");
                        this.activeProgram(gl, program);
                        var vColor = data.vColor || { x: 1.0, y: 0.0, z: 0.0, w: 0.5 };
                        this.syncUniforms(program, filter, data.textureWidth, data.textureHeight, false, { 'vColor': vColor });
                        offset += this.drawRectElements(data, offset);
                        break;
                    case 3 /* PUSH_MASK */:
                        program = web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.primitive_frag, "primitive");
                        this.activeProgram(gl, program);
                        this.syncUniforms(program, filter, data.textureWidth, data.textureHeight);
                        offset += this.drawPushMaskElements(data, offset);
                        break;
                    case 7 /* POP_MASK */:
                        program = web.EgretWebGLProgram.getProgram(gl, web.EgretShaderLib.default_vert, web.EgretShaderLib.primitive_frag, "primitive");
                        this.activeProgram(gl, program);
                        this.syncUniforms(program, filter, data.textureWidth, data.textureHeight);
                        offset += this.drawPopMaskElements(data, offset);
                        break;
                    case 4 /* PUSH_MASK_TEX */:
                        offset += this.drawPushMaskTex(data, offset);
                        break;
                    case 8 /* POP_MASK_TEX */:
                        offset += this.drawPopMaskTex(data, offset);
                        break;
                    case 5 /* PUSH_STENCIL_MASK_BEGIN */:
                        offset += this.drawPushStencilMaskBegin(data);
                        break;
                    case 6 /* PUSH_STENCIL_MASK_END */:
                        offset += this.drawPushStencilMaskEnd(data);
                        break;
                    case 9 /* POP_STENCIL_MASK_BEGIN */:
                        offset += this.drawPopStencilMaskBegin(data);
                        break;
                    case 10 /* POP_STENCIL_MASK_END */:
                        offset += this.drawPopStencilMaskEnd(data);
                        break;
                    case 12 /* BLEND */:
                        this.setBlendMode(data.value);
                        //SetPass call add
                        // recordData.setPassCalls++;
                        break;
                    case 13 /* RESIZE_TARGET */:
                        data.buffer.rootRenderTarget.resize(data.width, data.height);
                        this.onResize(data.width, data.height);
                        //SetPass call add
                        recordData.setPassCalls++;
                        break;
                    case 14 /* CLEAR_COLOR */:
                        if (this.activatedBuffer) {
                            var target = this.activatedBuffer.rootRenderTarget;
                            if (target.width != 0 || target.height != 0) {
                                target.clear(true);
                                //SetPass call add
                                recordData.setPassCalls++;
                            }
                        }
                        break;
                    case 15 /* ACT_BUFFER */:
                        this.activateBuffer(data.buffer, data.width, data.height);
                        //SetPass call add
                        recordData.setPassCalls += 3;
                        break;
                    case 16 /* ENABLE_SCISSOR */:
                        var buffer = this.activatedBuffer;
                        if (buffer) {
                            if (buffer.rootRenderTarget) {
                                buffer.rootRenderTarget.enabledStencil();
                            }
                            buffer.enableScissor(data.x, data.y, data.width, data.height);
                            //SetPass call add
                            // recordData.setPassCalls++;
                        }
                        break;
                    case 17 /* DISABLE_SCISSOR */:
                        buffer = this.activatedBuffer;
                        if (buffer) {
                            buffer.disableScissor();
                            //SetPass call add
                            // recordData.setPassCalls++;
                        }
                        break;
                    case 18 /* SMOOTHING */:
                        gl.bindTexture(gl.TEXTURE_2D, data.texture);
                        if (data.smoothing) {
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        }
                        else {
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                        }
                        break;
                    case 19 /* IGNORE */:
                        //do nothing
                        break;
                    default:
                        break;
                }
                return offset;
            };
            WebGLRenderContext.prototype.activeProgram = function (gl, program) {
                if (egret.pro.egret2dDriveMode || program != this.currentProgram) {
                    gl.useProgram(program.id);
                    // 目前所有attribute buffer的绑定方法都是一致的
                    var attribute = program.attributes;
                    for (var key in attribute) {
                        if (key === "aVertexPosition") {
                            gl.vertexAttribPointer(attribute["aVertexPosition"].location, 2, gl.FLOAT, false, 5 * 4, 0);
                            gl.enableVertexAttribArray(attribute["aVertexPosition"].location);
                        }
                        else if (key === "aTextureCoord") {
                            gl.vertexAttribPointer(attribute["aTextureCoord"].location, 2, gl.FLOAT, false, 5 * 4, 2 * 4);
                            gl.enableVertexAttribArray(attribute["aTextureCoord"].location);
                        }
                        else if (key === "aColor") {
                            gl.vertexAttribPointer(attribute["aColor"].location, 4, gl.UNSIGNED_BYTE, true, 5 * 4, 4 * 4);
                            gl.enableVertexAttribArray(attribute["aColor"].location);
                        }
                    }
                    this.currentProgram = program;
                    //SetPass call add
                    // this.activatedBuffer.$setPassCalls++;
                }
            };
            WebGLRenderContext.prototype.syncUniforms = function (program, filter, textureWidth, textureHeight, premultipliedAlpha, paramdict) {
                if (premultipliedAlpha === void 0) { premultipliedAlpha = false; }
                var uniforms = program.uniforms;
                var isCustomFilter = filter && filter.type === "custom";
                for (var key in uniforms) {
                    if (key == "$filterScale") { // 用于滤镜buffer缩放，忽略
                        continue;
                    }
                    if (key === "projectionVector") {
                        uniforms[key].setValue({ x: this.projectionX, y: this.projectionY });
                    }
                    else if (key === "uTextureSize") {
                        uniforms[key].setValue({ x: textureWidth, y: textureHeight });
                    }
                    else if (key === "uSampler") {
                        uniforms[key].setValue(0);
                    }
                    else if (premultipliedAlpha && key === "uPremultipliedAlpha") {
                        uniforms[key].setValue(true);
                    }
                    else if (key === "uSamplerAlphaMask") {
                        uniforms[key].setValue(1);
                    }
                    else if (key === sysSamplerMask) {
                        uniforms[key].setValue(2);
                    }
                    else {
                        if (paramdict !== undefined) {
                            var param = paramdict[key];
                            if (param !== undefined) {
                                uniforms[key].setValue(param);
                                continue;
                            }
                        }
                        var value = filter ? filter.$uniforms[key] : undefined;
                        if (value !== undefined) {
                            if ((filter.type == "glow" || filter.type.indexOf("blur") == 0)) {
                                if ((key == "blurX" || key == "blurY" || key == "dist")) {
                                    value = value * (filter.$uniforms.$filterScale || 1);
                                }
                                else if (key == "blur" && value.x != undefined && value.y != undefined) {
                                    var newValue = { x: 0, y: 0 };
                                    newValue.x = value.x * (filter.$uniforms.$filterScale != undefined ? filter.$uniforms.$filterScale : 1);
                                    newValue.y = value.y * (filter.$uniforms.$filterScale != undefined ? filter.$uniforms.$filterScale : 1);
                                    uniforms[key].setValue(newValue);
                                    continue;
                                }
                            }
                            uniforms[key].setValue(value);
                        }
                        else {
                            // egret.warn("filter custom: uniform " + key + " not defined!");
                        }
                    }
                }
            };
            /**
             * 画texture
             **/
            WebGLRenderContext.prototype.drawTextureElements = function (data, offset) {
                return egret.sys.drawTextureElements(this, data, offset);
                /*
                let gl: any = this.context;
                gl.activeTexture(gl.TEXTURE0); ///refactor
                gl.bindTexture(gl.TEXTURE_2D, data.texture);
                let size = data.count * 3;
                gl.drawElements(gl.TRIANGLES, size, gl.UNSIGNED_SHORT, offset * 2);
                return size;
                */
            };
            /**
             * @private
             * 画rect
             **/
            WebGLRenderContext.prototype.drawRectElements = function (data, offset) {
                var gl = this.context;
                // gl.bindTexture(gl.TEXTURE_2D, null);
                var size = data.count * 3;
                gl.drawElements(gl.TRIANGLES, size, gl.UNSIGNED_SHORT, offset * 2);
                return size;
            };
            /**
             * 画push mask
             **/
            WebGLRenderContext.prototype.drawPushMaskElements = function (data, offset) {
                var gl = this.context;
                var size = data.count * 3;
                var buffer = this.activatedBuffer;
                if (buffer) {
                    if (buffer.rootRenderTarget) {
                        buffer.rootRenderTarget.enabledStencil();
                    }
                    if (buffer.stencilHandleCount == 0) {
                        buffer.enableStencil();
                        gl.clear(gl.STENCIL_BUFFER_BIT); // clear
                    }
                    var level = buffer.stencilHandleCount;
                    buffer.stencilHandleCount++;
                    gl.colorMask(false, false, false, false);
                    gl.stencilFunc(gl.EQUAL, level, 0xFF);
                    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
                    // gl.bindTexture(gl.TEXTURE_2D, null);
                    gl.drawElements(gl.TRIANGLES, size, gl.UNSIGNED_SHORT, offset * 2);
                    gl.stencilFunc(gl.EQUAL, level + 1, 0xFF);
                    gl.colorMask(true, true, true, true);
                    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
                }
                return size;
            };
            /**
             * 画pop mask
             **/
            WebGLRenderContext.prototype.drawPopMaskElements = function (data, offset) {
                var gl = this.context;
                var size = data.count * 3;
                var buffer = this.activatedBuffer;
                if (buffer) {
                    buffer.stencilHandleCount--;
                    if (buffer.stencilHandleCount == 0) {
                        buffer.disableStencil(); // skip this draw
                    }
                    else {
                        var level = buffer.stencilHandleCount;
                        gl.colorMask(false, false, false, false);
                        gl.stencilFunc(gl.EQUAL, level + 1, 0xFF);
                        gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);
                        // gl.bindTexture(gl.TEXTURE_2D, null);
                        gl.drawElements(gl.TRIANGLES, size, gl.UNSIGNED_SHORT, offset * 2);
                        gl.stencilFunc(gl.EQUAL, level, 0xFF);
                        gl.colorMask(true, true, true, true);
                        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
                    }
                }
                return size;
            };
            WebGLRenderContext.prototype.drawPushMaskTex = function (data, offset) {
                var dataUV2Clamp = data.uv2Clamp;
                if (data.texture2Mat) {
                    this.$maskTextureStack.push({
                        texture: data.texture, mat: data.texture2Mat.to3x3ArrayTmp(),
                        uv2Clamp: { x: dataUV2Clamp[0], y: dataUV2Clamp[1], z: dataUV2Clamp[2], w: dataUV2Clamp[3] },
                        allowUV2Clamp: data.allowUV2Clamp,
                        buffer: data.buffer
                    });
                }
                egret.Matrix.release(data.texture2Mat);
                data.texture2Mat = null;
                data.uv2Clamp = null;
                data.buffer = null;
                return 0;
            };
            WebGLRenderContext.prototype.drawPopMaskTex = function (data, offset) {
                this.$maskTextureStack.pop();
                return 0;
            };
            /** 拆解stencil功能
             *
             * drawPushStencilMaskBegin()
             * here draw custom mask node()
             * drawPushStencilMaskEnd()
             *
             * here draw display nodes()
             *
             * drawPopStencilMaskBegin()
             * here draw custom mask again()
             * drawPopStencilMaskEnd()
             *
             */
            WebGLRenderContext.prototype.drawPushStencilMaskBegin = function (data) {
                var gl = this.context;
                var buffer = this.activatedBuffer;
                if (buffer) {
                    if (buffer.rootRenderTarget) {
                        buffer.rootRenderTarget.enabledStencil();
                    }
                    if (buffer.stencilHandleCount == 0) {
                        buffer.enableStencil();
                    }
                    var level = buffer.stencilHandleCount;
                    buffer.stencilHandleCount++;
                    gl.colorMask(false, false, false, false);
                    if (level == 0) {
                        //当成clear来用
                        gl.stencilFunc(gl.ALWAYS, level + 1, 0xFF);
                        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
                    }
                    else {
                        gl.stencilFunc(gl.EQUAL, level, 0xFF);
                        gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
                    }
                }
                return 0;
            };
            WebGLRenderContext.prototype.drawPushStencilMaskEnd = function (data) {
                var gl = this.context;
                var buffer = this.activatedBuffer;
                if (buffer) {
                    var level = buffer.stencilHandleCount;
                    gl.stencilFunc(gl.EQUAL, level, 0xFF);
                    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
                    gl.colorMask(true, true, true, true);
                }
                return 0;
            };
            WebGLRenderContext.prototype.drawPopStencilMaskBegin = function (data) {
                var gl = this.context;
                var buffer = this.activatedBuffer;
                if (buffer) {
                    buffer.stencilHandleCount--;
                    var level = buffer.stencilHandleCount;
                    gl.stencilFunc(gl.EQUAL, level + 1, 0xFF);
                    gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);
                    gl.colorMask(false, false, false, false);
                }
                return 0;
            };
            WebGLRenderContext.prototype.drawPopStencilMaskEnd = function (data) {
                var gl = this.context;
                var buffer = this.activatedBuffer;
                if (buffer) {
                    var level = buffer.stencilHandleCount;
                    gl.stencilFunc(gl.EQUAL, level, 0xFF);
                    gl.colorMask(true, true, true, true);
                    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
                    if (buffer.stencilHandleCount == 0) {
                        buffer.disableStencil(); // skip this draw
                    }
                }
                return 0;
            };
            /**
             * 设置混色
             */
            WebGLRenderContext.prototype.setBlendMode = function (value) {
                var gl = this.context;
                var blendModeWebGL = WebGLRenderContext.blendModesForGL[value];
                if (blendModeWebGL) {
                    gl.blendFunc(blendModeWebGL[0], blendModeWebGL[1]);
                }
                var equation = "add";
                if (value === 'max') {
                    equation = "max";
                }
                if (this.currentEquation != equation) {
                    if (equation === "add") {
                        gl.blendEquation(gl.FUNC_ADD);
                    }
                    else if (this.$extBlendMinMax != null) {
                        gl.blendEquation(this.$extBlendMinMax.MAX_EXT);
                    }
                    this.currentEquation = equation;
                }
            };
            /**
             * 应用滤镜绘制给定的render target
             * 此方法不会导致input被释放，所以如果需要释放input，需要调用此方法后手动调用release
             */
            WebGLRenderContext.prototype.drawTargetWidthFilters = function (filters, input) {
                var originInput = input, filtersLen = filters.length, output;
                // 应用前面的滤镜
                if (filtersLen > 1) {
                    for (var i = 0; i < filtersLen - 1; i++) {
                        var filter_1 = filters[i];
                        var width = input.rootRenderTarget.width;
                        var height = input.rootRenderTarget.height;
                        output = web.WebGLRenderBuffer.create(width, height);
                        var scale = Math.max(egret.sys.DisplayList.$canvasScaleFactor, 2);
                        output.setTransform(scale, 0, 0, scale, 0, 0);
                        output.globalAlpha = 1;
                        this.drawToRenderTarget(filter_1, input, output);
                        if (input != originInput) {
                            web.WebGLRenderBuffer.release(input);
                        }
                        input = output;
                    }
                }
                // 应用最后一个滤镜并绘制到当前场景中
                var filter = filters[filtersLen - 1];
                this.drawToRenderTarget(filter, input, this.currentBuffer);
                // 释放掉用于交换的buffer
                if (input != originInput) {
                    web.WebGLRenderBuffer.release(input);
                }
            };
            /**
             * 向一个renderTarget中绘制
             * */
            WebGLRenderContext.prototype.drawToRenderTarget = function (filter, input, output) {
                if (this.contextLost) {
                    return;
                }
                if (this.vao.reachMaxSize()) {
                    this.$drawWebGL();
                }
                var bufferPushSuccess = this.pushBuffer(output);
                var originInput = input, temp, width = input.rootRenderTarget.width, height = input.rootRenderTarget.height;
                // 模糊滤镜分别处理blurX与blurY
                if (filter.type == "blur") {
                    var blurXFilter = filter.blurXFilter;
                    var blurYFilter = filter.blurYFilter;
                    if (blurXFilter.blurX != 0 && blurYFilter.blurY != 0) {
                        temp = web.WebGLRenderBuffer.create(width, height);
                        var scale_1 = Math.max(egret.sys.DisplayList.$canvasScaleFactor, 2);
                        temp.setTransform(1, 0, 0, 1, 0, 0);
                        temp.transform(scale_1, 0, 0, scale_1, 0, 0);
                        temp.globalAlpha = 1;
                        this.drawToRenderTarget(filter.blurXFilter, input, temp);
                        if (input != originInput) {
                            web.WebGLRenderBuffer.release(input);
                        }
                        input = temp;
                        filter = blurYFilter;
                    }
                    else {
                        filter = blurXFilter.blurX === 0 ? blurYFilter : blurXFilter;
                    }
                }
                // 绘制input结果到舞台
                output.saveTransform();
                var scale = Math.max(egret.sys.DisplayList.$canvasScaleFactor, 2);
                output.transform(1 / scale, 0, 0, 1 / scale, 0, 0);
                output.transform(1, 0, 0, -1, 0, height);
                output.currentTexture = input.rootRenderTarget.texture;
                this.vao.cacheArrays(output, 0, 0, width, height, 0, 0, width, height, width, height);
                output.restoreTransform();
                this.drawCmdManager.pushDrawTexture(input.rootRenderTarget.texture, 2, filter, width, height);
                // 释放掉input
                if (input != originInput) {
                    web.WebGLRenderBuffer.release(input);
                }
                if (bufferPushSuccess) {
                    this.popBuffer();
                }
            };
            WebGLRenderContext.initBlendMode = function () {
                /*参考
                gl.ZERO = 0
                gl.ONE = 1
                gl.SRC_COLOR = 768
                gl.ONE_MINUS_SRC_COLOR = 769
                gl.DST_COLOR = 774
                gl.ONE_MINUS_DST_COLOR = 775
                gl.SRC_ALPHA = 770
                gl.ONE_MINUS_SRC_ALPHA = 771
                gl.DST_ALPHA = 772
                gl.ONE_MINUS_DST_ALPHA = 773
                gl.CONSTANT_COLOR = 32769
                gl.ONE_MINUS_CONSTANT_COLOR = 32770
                gl.CONSTANT_ALPHA = 32771
                gl.ONE_MINUS_CONSTANT_ALPHA = 32772
                gl.SRC_ALPHA_SATURATE = 776
                */
                WebGLRenderContext.blendModesForGL = {};
                WebGLRenderContext.blendModesForGL["source-over"] = [1, 771];
                WebGLRenderContext.blendModesForGL["lighter"] = [1, 1];
                WebGLRenderContext.blendModesForGL["lighter-in"] = [770, 771];
                WebGLRenderContext.blendModesForGL["destination-out"] = [0, 771];
                WebGLRenderContext.blendModesForGL["destination-in"] = [0, 770];
                WebGLRenderContext.blendModesForGL["destination-overwrite"] = [772, 773];
            };
            WebGLRenderContext.glContextId = 0;
            WebGLRenderContext.blendModesForGL = null;
            return WebGLRenderContext;
        }());
        web.WebGLRenderContext = WebGLRenderContext;
        __reflect(WebGLRenderContext.prototype, "egret.web.WebGLRenderContext", ["egret.sys.RenderContext"]);
        WebGLRenderContext.initBlendMode();
        egret.sys.WebGLRenderContext = WebGLRenderContext;
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         * WebGL渲染缓存
         */
        var WebGLRenderBuffer = /** @class */ (function (_super) {
            __extends(WebGLRenderBuffer, _super);
            function WebGLRenderBuffer(width, height, root, bNew) {
                var _this = _super.call(this) || this;
                //
                _this.currentTexture = null;
                _this.globalAlpha = 1;
                _this.globalTintColor = 0xFFFFFF;
                /**
                 * stencil state
                 * 模版开关状态
                 */
                _this.stencilState = false;
                _this.$stencilList = [];
                _this.stencilHandleCount = 0;
                /**
                 * scissor state
                 * scissor 开关状态
                 */
                _this.$scissorState = false;
                _this.scissorRect = new egret.Rectangle();
                _this.$hasScissor = false;
                _this.$renderCanvas = 0;
                _this.$sprites = 0;
                _this.$drawCalls = 0;
                _this.$drawBatches = 0;
                _this.$setPassCalls = 0;
                _this.$computeDrawCall = false;
                _this.$ocComputed = 0;
                _this.$ocCulled = 0;
                _this.globalMatrix = new egret.Matrix();
                _this.savedGlobalMatrix = new egret.Matrix();
                _this.bufferMatrix = new egret.Matrix(); //from world to buffer scale
                _this.$offsetX = 0;
                _this.$offsetY = 0;
                // 获取webglRenderContext
                if (bNew) {
                    _this.context = new web.WebGLRenderContext(width, height, null, true);
                }
                else {
                    _this.context = web.WebGLRenderContext.getInstance(width, height);
                }
                if (egret.nativeRender) {
                    if (root) {
                        _this.surface = _this.context.surface;
                    }
                    else {
                        _this.surface = new egret_native.NativeRenderSurface(_this, width, height, root);
                    }
                    _this.rootRenderTarget = null;
                    return _this;
                }
                // buffer 对应的 render target
                _this.rootRenderTarget = new web.WebGLRenderTarget(_this.context.context, 3, 3);
                if (bNew) {
                    _this.rootRenderTarget.assignWebGLRenderContext = _this.context;
                }
                if (width && height) {
                    _this.resize(width, height);
                }
                // 如果是第一个加入的buffer，说明是舞台buffer
                _this.root = root;
                // 如果是用于舞台渲染的renderBuffer，则默认添加renderTarget到renderContext中，而且是第一个
                if (_this.root) {
                    _this.context.pushBuffer(_this);
                    // 画布
                    _this.surface = _this.context.surface;
                    _this.$computeDrawCall = true;
                }
                else {
                    // 由于创建renderTarget造成的frameBuffer绑定，这里重置绑定
                    var lastBuffer = _this.context.activatedBuffer;
                    if (lastBuffer) {
                        lastBuffer.rootRenderTarget.activate();
                    }
                    _this.rootRenderTarget.initFrameBuffer();
                    _this.surface = _this.rootRenderTarget;
                }
                return _this;
            }
            WebGLRenderBuffer.prototype.enableStencil = function () {
                if (!this.stencilState) {
                    this.context.enableStencilTest();
                    this.stencilState = true;
                }
            };
            WebGLRenderBuffer.prototype.disableStencil = function () {
                if (this.stencilState) {
                    this.context.disableStencilTest();
                    this.stencilState = false;
                }
            };
            WebGLRenderBuffer.prototype.restoreStencil = function () {
                if (this.stencilState) {
                    this.context.enableStencilTest();
                }
                else {
                    this.context.disableStencilTest();
                }
            };
            WebGLRenderBuffer.prototype.enableScissor = function (x, y, width, height) {
                if (!this.$scissorState) {
                    this.$scissorState = true;
                    this.scissorRect.setTo(x, y, width, height);
                    this.context.enableScissorTest(this.scissorRect);
                }
            };
            WebGLRenderBuffer.prototype.disableScissor = function () {
                if (this.$scissorState) {
                    this.$scissorState = false;
                    this.scissorRect.setEmpty();
                    this.context.disableScissorTest();
                }
            };
            WebGLRenderBuffer.prototype.restoreScissor = function () {
                if (this.$scissorState) {
                    this.context.enableScissorTest(this.scissorRect);
                }
                else {
                    this.context.disableScissorTest();
                }
            };
            Object.defineProperty(WebGLRenderBuffer.prototype, "width", {
                /**
                 * 渲染缓冲的宽度，以像素为单位。
                 * @readOnly
                 */
                get: function () {
                    if (egret.nativeRender) {
                        return this.surface.width;
                    }
                    else {
                        return this.rootRenderTarget.width;
                    }
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(WebGLRenderBuffer.prototype, "height", {
                /**
                 * 渲染缓冲的高度，以像素为单位。
                 * @readOnly
                 */
                get: function () {
                    if (egret.nativeRender) {
                        return this.surface.height;
                    }
                    else {
                        return this.rootRenderTarget.height;
                    }
                },
                enumerable: true,
                configurable: true
            });
            /**
             * 改变渲染缓冲的大小并清空缓冲区
             * @param width 改变后的宽
             * @param height 改变后的高
             * @param useMaxSize 若传入true，则将改变后的尺寸与已有尺寸对比，保留较大的尺寸。
             */
            WebGLRenderBuffer.prototype.resize = function (width, height, useMaxSize) {
                width = width || 1;
                height = height || 1;
                if (egret.nativeRender) {
                    this.surface.resize(width, height);
                    return;
                }
                var bufferPushSuccess = this.context.pushBuffer(this);
                // render target 尺寸重置
                if (width != this.rootRenderTarget.width || height != this.rootRenderTarget.height) {
                    this.context.drawCmdManager.pushResize(this, width, height);
                    // 同步更改宽高
                    this.rootRenderTarget.width = width;
                    this.rootRenderTarget.height = height;
                }
                // 如果是舞台的渲染缓冲，执行resize，否则surface大小不随之改变
                if (this.root) {
                    this.context.resize(width, height, useMaxSize);
                }
                this.context.clear();
                if (bufferPushSuccess) {
                    this.context.popBuffer();
                }
            };
            /**
             * 获取指定区域的像素
             */
            WebGLRenderBuffer.prototype.getPixels = function (x, y, width, height) {
                if (width === void 0) { width = 1; }
                if (height === void 0) { height = 1; }
                var pixels = new Uint8Array(4 * width * height);
                if (egret.nativeRender) {
                    egret_native.activateBuffer(this);
                    egret_native.nrGetPixels(x, y, width, height, pixels);
                    egret_native.activateBuffer(null);
                }
                else {
                    var useFrameBuffer = this.rootRenderTarget.useFrameBuffer;
                    this.rootRenderTarget.useFrameBuffer = true;
                    this.rootRenderTarget.activate();
                    this.context.getPixels(x, this.height - y - height, width, height, pixels);
                    this.rootRenderTarget.useFrameBuffer = useFrameBuffer;
                    this.rootRenderTarget.activate();
                }
                //图像反转
                var result = new Uint8Array(4 * width * height);
                for (var i = 0; i < height; i++) {
                    for (var j = 0; j < width; j++) {
                        var index1 = (width * (height - i - 1) + j) * 4;
                        var index2 = (width * i + j) * 4;
                        var a = pixels[index2 + 3];
                        result[index1] = Math.round(pixels[index2] / a * 255);
                        result[index1 + 1] = Math.round(pixels[index2 + 1] / a * 255);
                        result[index1 + 2] = Math.round(pixels[index2 + 2] / a * 255);
                        result[index1 + 3] = pixels[index2 + 3];
                    }
                }
                return result;
            };
            /**
             * 转换成base64字符串，如果图片（或者包含的图片）跨域，则返回null
             * @param type 转换的类型，如: "image/png","image/jpeg"
             */
            WebGLRenderBuffer.prototype.toDataURL = function (type, encoderOptions) {
                return this.context.surface.toDataURL(type, encoderOptions);
            };
            /**
             * 销毁绘制对象
             */
            WebGLRenderBuffer.prototype.destroy = function () {
                this.context.destroy();
            };
            WebGLRenderBuffer.prototype.onRenderFinish = function () {
                this.$sprites = 0;
                this.$drawCalls = 0;
                this.$drawBatches = 0;
                this.$setPassCalls = 0;
                this.$ocComputed = 0;
                this.$ocCulled = 0;
                this.$renderCanvas = 0;
            };
            /**
             * 交换frameBuffer中的图像到surface中
             * @param width 宽度
             * @param height 高度
             */
            WebGLRenderBuffer.prototype.drawFrameBufferToSurface = function (sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, clear) {
                if (clear === void 0) { clear = false; }
                this.rootRenderTarget.useFrameBuffer = false;
                this.rootRenderTarget.activate();
                this.context.disableStencilTest(); // 切换frameBuffer注意要禁用STENCIL_TEST
                this.context.disableScissorTest();
                this.setTransform(1, 0, 0, 1, 0, 0);
                this.globalAlpha = 1;
                this.context.setGlobalCompositeOperation("source-over");
                clear && this.context.clear();
                this.context.drawImage(this.rootRenderTarget, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, sourceWidth, sourceHeight, false);
                this.context.$drawWebGL();
                this.rootRenderTarget.useFrameBuffer = true;
                this.rootRenderTarget.activate();
                this.restoreStencil();
                this.restoreScissor();
            };
            /**
             * 交换surface的图像到frameBuffer中
             * @param width 宽度
             * @param height 高度
             */
            WebGLRenderBuffer.prototype.drawSurfaceToFrameBuffer = function (sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, clear) {
                if (clear === void 0) { clear = false; }
                this.rootRenderTarget.useFrameBuffer = true;
                this.rootRenderTarget.activate();
                this.context.disableStencilTest(); // 切换frameBuffer注意要禁用STENCIL_TEST
                this.context.disableScissorTest();
                this.setTransform(1, 0, 0, 1, 0, 0);
                this.globalAlpha = 1;
                this.context.setGlobalCompositeOperation("source-over");
                clear && this.context.clear();
                this.context.drawImage(this.context.surface, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, sourceWidth, sourceHeight, false);
                this.context.$drawWebGL();
                this.rootRenderTarget.useFrameBuffer = false;
                this.rootRenderTarget.activate();
                this.restoreStencil();
                this.restoreScissor();
            };
            /**
             * 清空缓冲区数据
             */
            WebGLRenderBuffer.prototype.clear = function () {
                var bufferPushSuccess = this.context.pushBuffer(this);
                this.context.clear();
                if (bufferPushSuccess) {
                    this.context.popBuffer();
                }
            };
            WebGLRenderBuffer.prototype.setTransform = function (a, b, c, d, tx, ty) {
                // this.globalMatrix.setTo(a, b, c, d, tx, ty);
                var matrix = this.globalMatrix;
                matrix.a = a;
                matrix.b = b;
                matrix.c = c;
                matrix.d = d;
                matrix.tx = tx;
                matrix.ty = ty;
                this.bufferMatrix.copyFrom(matrix);
            };
            WebGLRenderBuffer.prototype.transform = function (a, b, c, d, tx, ty) {
                var matrix = this.globalMatrix;
                var a1 = matrix.a;
                var b1 = matrix.b;
                var c1 = matrix.c;
                var d1 = matrix.d;
                if (a != 1 || b != 0 || c != 0 || d != 1) {
                    matrix.a = a * a1 + b * c1;
                    matrix.b = a * b1 + b * d1;
                    matrix.c = c * a1 + d * c1;
                    matrix.d = c * b1 + d * d1;
                }
                matrix.tx = tx * a1 + ty * c1 + matrix.tx;
                matrix.ty = tx * b1 + ty * d1 + matrix.ty;
            };
            WebGLRenderBuffer.prototype.useOffset = function () {
                var self = this;
                if (self.$offsetX != 0 || self.$offsetY != 0) {
                    self.globalMatrix.append(1, 0, 0, 1, self.$offsetX, self.$offsetY);
                    self.$offsetX = self.$offsetY = 0;
                }
            };
            WebGLRenderBuffer.prototype.saveTransform = function () {
                var matrix = this.globalMatrix;
                var sMatrix = this.savedGlobalMatrix;
                sMatrix.a = matrix.a;
                sMatrix.b = matrix.b;
                sMatrix.c = matrix.c;
                sMatrix.d = matrix.d;
                sMatrix.tx = matrix.tx;
                sMatrix.ty = matrix.ty;
            };
            WebGLRenderBuffer.prototype.restoreTransform = function () {
                var matrix = this.globalMatrix;
                var sMatrix = this.savedGlobalMatrix;
                matrix.a = sMatrix.a;
                matrix.b = sMatrix.b;
                matrix.c = sMatrix.c;
                matrix.d = sMatrix.d;
                matrix.tx = sMatrix.tx;
                matrix.ty = sMatrix.ty;
            };
            /**
             * 创建一个buffer实例
             */
            WebGLRenderBuffer.create = function (width, height) {
                var buffer = web.renderBufferPool.pop();
                // width = Math.min(width, 1024);
                // height = Math.min(height, 1024);
                if (buffer) {
                    buffer.resize(width, height);
                    var matrix = buffer.globalMatrix;
                    matrix.a = 1;
                    matrix.b = 0;
                    matrix.c = 0;
                    matrix.d = 1;
                    matrix.tx = 0;
                    matrix.ty = 0;
                    buffer.globalAlpha = 1;
                    buffer.$offsetX = 0;
                    buffer.$offsetY = 0;
                }
                else {
                    buffer = new WebGLRenderBuffer(width, height);
                    buffer.$computeDrawCall = false;
                }
                buffer.bufferMatrix.copyFrom(buffer.globalMatrix);
                return buffer;
            };
            /**
             * 回收一个buffer实例
             */
            WebGLRenderBuffer.release = function (buffer) {
                web.renderBufferPool.push(buffer);
            };
            WebGLRenderBuffer.autoClear = true;
            return WebGLRenderBuffer;
        }(egret.HashObject));
        web.WebGLRenderBuffer = WebGLRenderBuffer;
        __reflect(WebGLRenderBuffer.prototype, "egret.web.WebGLRenderBuffer", ["egret.sys.RenderBuffer"]);
        web.renderBufferPool = []; //渲染缓冲区对象池
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        var blendModes = ["source-over", "lighter", "destination-out", "max"];
        var defaultCompositeOpStack = ["source-over"];
        var BLACK_COLOR = "#000000";
        var CAPS_STYLES = { none: 'butt', square: 'square', round: 'round' };
        // let renderBufferPool: WebGLRenderBuffer[] = [];//渲染缓冲区对象池
        /**
         * @private
         * WebGL渲染器
         */
        var $logTime = Date.now();
        var WebGLRenderer = /** @class */ (function () {
            function WebGLRenderer() {
                /**
                 * Do special treatment on wechat ios10
                 */
                this.wxiOS10 = false;
                this.nestLevel = 0; //渲染的嵌套层次，0表示在调用堆栈的最外层。
                /**渲染逻辑分层指令管理器 */
                this.m_objRenderLogicHierarchy = new web.WebGLRenderLogicHierarchy();
                /**渲染逻辑后处理指令管理器 */
                this.m_objRenderLogicLastRender = new web.WebGLRenderLogicLastRender();
            }
            /**
             * 渲染一个显示对象
             * @param displayObject 要渲染的显示对象
             * @param buffer 渲染缓冲
             * @param matrix 要对显示对象整体叠加的变换矩阵
             * @param dirtyList 脏矩形列表
             * @param forRenderTexture 绘制目标是RenderTexture的标志
             * @returns drawCall触发绘制的次数
             */
            WebGLRenderer.prototype.render = function (displayObject, buffer, matrix, forRenderTexture) {
                this.nestLevel++;
                var webglBuffer = buffer;
                var webglBufferContext = webglBuffer.context;
                var root = forRenderTexture ? displayObject : null;
                var bufferPushSuccess = webglBufferContext.pushBuffer(webglBuffer);
                egret.UpdateGlobalFrameID();
                egret.SetGlobalConcatenatedMatrixCache(true);
                this.preprocessFullScreenNodes(displayObject);
                //绘制显示对象
                webglBuffer.bufferMatrix.copyFrom(matrix);
                webglBuffer.transform(matrix.a, matrix.b, matrix.c, matrix.d, 0, 0);
                this.drawDisplayObject(displayObject, webglBuffer, matrix.tx, matrix.ty, true);
                webglBufferContext.$drawWebGL();
                webglBufferContext.setGlobalCompositeOperation("source-over");
                var sprite = webglBuffer.$sprites;
                var drawCall = webglBuffer.$drawCalls;
                var setPassCall = webglBuffer.$setPassCalls;
                var drawBatch = webglBuffer.$drawBatches;
                var ocComputed = webglBuffer.$ocComputed;
                var ocCulled = webglBuffer.$ocCulled;
                var renderCanvas = webglBuffer.$renderCanvas;
                webglBuffer.onRenderFinish();
                if (bufferPushSuccess) {
                    webglBufferContext.popBuffer();
                }
                var invert = egret.Matrix.create();
                matrix.$invertInto(invert);
                webglBuffer.transform(invert.a, invert.b, invert.c, invert.d, 0, 0);
                egret.Matrix.release(invert);
                egret.SetGlobalConcatenatedMatrixCache(false);
                this.nestLevel--;
                // if (this.nestLevel === 0) {
                //     //最大缓存6个渲染缓冲
                //     if (renderBufferPool.length > 6) {
                //         renderBufferPool.length = 6;
                //     }
                //     let length = renderBufferPool.length;
                //     for (let i = 0; i < length; i++) {
                //         renderBufferPool[i].resize(0, 0);
                //     }
                // }
                return { drawcall: drawCall, sprite: sprite, setPassCall: setPassCall, drawBatch: drawBatch, ocComputed: ocComputed, ocCulled: ocCulled, renderCanvas: renderCanvas };
            };
            WebGLRenderer.prototype.preprocessFullScreenNodes = function (root) {
                this.$topFullScreenNode = null;
                var allFullScreenNodes = this.getFullScreenNodes(root);
                if (egret.sys.$TempStage && egret.sys.$TempStage.enableOC) {
                    for (var _i = 0, allFullScreenNodes_1 = allFullScreenNodes; _i < allFullScreenNodes_1.length; _i++) {
                        var node = allFullScreenNodes_1[_i];
                        if (this.$topFullScreenNode && node != this.$topFullScreenNode) {
                            var hide = false;
                            // middle
                            if (this.$topFullScreenNode.fullScreenMode == 2 /* FULLSCREEN */) {
                                if (node.fullScreenMode == 2 /* FULLSCREEN */ || node.fullScreenMode == 1 /* PARTIAL_FULL */) {
                                    hide = true;
                                }
                            }
                            // up
                            else if (this.$topFullScreenNode.fullScreenMode == 4 /* FULLSCREEN_UP */) {
                                if ((node.fullScreenMode == 2 /* FULLSCREEN */ || node.fullScreenMode == 1 /* PARTIAL_FULL */) ||
                                    (node.fullScreenMode == 4 /* FULLSCREEN_UP */ || node.fullScreenMode == 3 /* PARTIAL_FULL_UP */)) {
                                    hide = true;
                                }
                            }
                            // down
                            else if (this.$topFullScreenNode.fullScreenMode == 6 /* FULLSCREEN_DOWN */) {
                                if ((node.fullScreenMode == 2 /* FULLSCREEN */ || node.fullScreenMode == 1 /* PARTIAL_FULL */) ||
                                    (node.fullScreenMode == 6 /* FULLSCREEN_DOWN */ || node.fullScreenMode == 5 /* PARTIAL_FULL_DOWN */)) {
                                    hide = true;
                                }
                            }
                            // all
                            else if (this.$topFullScreenNode.fullScreenMode == 8 /* FULLSCREEN_ALL */) {
                                if ((node.fullScreenMode == 2 /* FULLSCREEN */ || node.fullScreenMode == 1 /* PARTIAL_FULL */) ||
                                    (node.fullScreenMode == 4 /* FULLSCREEN_UP */ || node.fullScreenMode == 3 /* PARTIAL_FULL_UP */) ||
                                    (node.fullScreenMode == 6 /* FULLSCREEN_DOWN */ || node.fullScreenMode == 5 /* PARTIAL_FULL_DOWN */) ||
                                    (node.fullScreenMode == 8 /* FULLSCREEN_ALL */ || node.fullScreenMode == 7 /* PARTIAL_FULL_ALL */)) {
                                    hide = true;
                                }
                            }
                            if (hide) {
                                node.hiddenInThisFrame();
                            }
                        }
                        else {
                            break;
                        }
                    }
                }
                return allFullScreenNodes;
            };
            WebGLRenderer.prototype.getFullScreenNodes = function (displayObject) {
                var allFullScreenNodes = [];
                var stack = [];
                stack.push(displayObject);
                while (stack.length > 0) {
                    var node = stack.pop();
                    if (node.$renderMode === 1 /* NONE */) {
                        continue;
                    }
                    else if (node.isPartialFull) {
                        allFullScreenNodes.push(node);
                    }
                    else if (node.isFull) {
                        allFullScreenNodes.push(node);
                        this.$topFullScreenNode = node;
                    }
                    else if (node.fullScreenNodeCount > 0) {
                        var children = node.$children;
                        if (children) {
                            if (node.sortableChildren && node.$sortDirty) {
                                //绘制排序
                                node.sortChildren();
                            }
                            for (var i = children.length - 1; i >= 0; i--) {
                                var child = children[i];
                                stack.push(child);
                            }
                        }
                    }
                }
                return allFullScreenNodes;
            };
            /**
             * 判断节点是否被全屏节点挡住
             * @param displayObject 当前渲染节点
             * @returns true: 被挡住; false: 可见
             */
            WebGLRenderer.prototype.isCulled = function (displayObject) {
                if (!displayObject.visibleInThisFrame()) {
                    return true;
                }
                return false;
            };
            /**
             * @private
             * 绘制一个显示对象
             */
            WebGLRenderer.prototype.drawDisplayObject = function (displayObject, buffer, offsetX, offsetY, isStage) {
                if (this.isCulled(displayObject)) {
                    buffer.$ocCulled++;
                    return 0;
                }
                buffer.$sprites++;
                if (egret.Capabilities.isEditor) {
                    displayObject.clearErrorInfo();
                }
                var drawCalls = 0;
                var node;
                var hasBlendMode = (displayObject.blendModeValue !== 0);
                var compositeOp;
                if (hasBlendMode) {
                    compositeOp = blendModes[displayObject.blendModeValue];
                    if (!compositeOp) {
                        compositeOp = defaultCompositeOpStack[defaultCompositeOpStack.length - 1];
                    }
                }
                var displayList = displayObject.$displayList;
                if (displayList && !isStage) {
                    if (displayObject.$cacheDirty || displayObject.$renderDirty ||
                        displayList.$canvasScaleX != egret.sys.DisplayList.$canvasScaleX ||
                        displayList.$canvasScaleY != egret.sys.DisplayList.$canvasScaleY) {
                        drawCalls += displayList.drawToSurface().drawcall;
                    }
                    node = displayList.$renderNode;
                }
                else {
                    if (displayObject.$renderDirty) {
                        node = displayObject.$getRenderNode();
                    }
                    else {
                        node = displayObject.$renderNode;
                    }
                }
                displayObject.$cacheDirty = false;
                if (node) {
                    drawCalls++;
                    buffer.$offsetX = offsetX;
                    buffer.$offsetY = offsetY;
                    switch (node.type) {
                        case 1 /* BitmapNode */:
                            this.renderBitmap(node, buffer);
                            break;
                        case 2 /* TextNode */:
                            this.renderText(node, buffer);
                            break;
                        case 3 /* GraphicsNode */:
                            this.renderGraphics(node, buffer);
                            break;
                        case 7 /* SdfGraphicsNode */:
                            this.renderSdfGraphics(node, buffer);
                            break;
                        case 4 /* GroupNode */:
                            this.renderGroup(node, buffer);
                            break;
                        case 5 /* MeshNode */:
                            this.renderMesh(node, buffer, compositeOp);
                            break;
                        case 6 /* NormalBitmapNode */:
                            node.nRenderLogicHierarchy = displayObject.nRenderLogicHierarchy;
                            node.bRenderLogicLastRender = displayObject.bRenderLogicLastRender;
                            this.renderNormalBitmap(node, buffer, compositeOp, displayObject.$depthMaskInfoCache);
                            break;
                    }
                    buffer.$offsetX = 0;
                    buffer.$offsetY = 0;
                }
                if (displayList && !isStage) {
                    return drawCalls;
                }
                var children = displayObject.$children;
                if (children) {
                    var bRenderLogicHierarchyEnable = egret.sys.openRenderLogicHierarchy && displayObject.bRenderLogicHierarchyEnable;
                    if (bRenderLogicHierarchyEnable) {
                        this.m_objRenderLogicHierarchy.start();
                    }
                    var bRenderLogicLastRenderEnable = egret.sys.openRenderLogicLastRender && displayObject.bRenderLogicLastRenderEnable;
                    if (bRenderLogicLastRenderEnable) {
                        this.m_objRenderLogicLastRender.start();
                    }
                    if (displayObject.sortableChildren && displayObject.$sortDirty) {
                        //绘制排序
                        displayObject.sortChildren();
                    }
                    var length_7 = children.length;
                    for (var i = 0; i < length_7; i++) {
                        var child = children[i];
                        var offsetX2 = void 0;
                        var offsetY2 = void 0;
                        var tempAlpha = void 0;
                        var tempTintColor = void 0;
                        if (child.$alpha != 1) {
                            tempAlpha = buffer.globalAlpha;
                            buffer.globalAlpha *= child.$alpha;
                        }
                        if (child.tint !== 0xFFFFFF) {
                            tempTintColor = buffer.globalTintColor;
                            buffer.globalTintColor = child.$tintRGB;
                        }
                        var savedMatrix = void 0;
                        if (child.$useTranslate) {
                            var m = child.$getMatrix();
                            offsetX2 = offsetX + child.$x;
                            offsetY2 = offsetY + child.$y;
                            var m2 = buffer.globalMatrix;
                            savedMatrix = egret.Matrix.create();
                            savedMatrix.a = m2.a;
                            savedMatrix.b = m2.b;
                            savedMatrix.c = m2.c;
                            savedMatrix.d = m2.d;
                            savedMatrix.tx = m2.tx;
                            savedMatrix.ty = m2.ty;
                            buffer.transform(m.a, m.b, m.c, m.d, offsetX2, offsetY2);
                            offsetX2 = -child.$getAnchorOffsetX();
                            offsetY2 = -child.$getAnchorOffsetY();
                        }
                        else {
                            offsetX2 = offsetX + child.$x - child.$getAnchorOffsetX();
                            offsetY2 = offsetY + child.$y - child.$getAnchorOffsetY();
                        }
                        var optimized = false; // 是有优化掉了=>即不渲染了
                        // 容器开启该容器有optimizeScrollRect优化 & 该容器有optimizeScrollRect
                        if (displayObject.bOptimizeScrollRectEnable && displayObject.objOptimizeScrollRect) {
                            if (child.$renderMode == 1 /* NONE */) {
                                optimized = true;
                            }
                            else if (child.objOptimizeScrollRectFun) { // TODO: 子对象由上层hook检查函数
                                optimized = child.objOptimizeScrollRectFun();
                            }
                            else {
                                var rect = displayObject.objOptimizeScrollRect;
                                var left = rect.x;
                                var top = rect.y;
                                var right = rect.right;
                                var bottom = rect.bottom;
                                var _x, _y;
                                var toRender = ((_x = child.x) < right && (_x + child.width) > left && (_y = child.y) < bottom && (_y + child.height) > top);
                                if (!toRender) {
                                    optimized = true;
                                }
                            }
                        }
                        if (!optimized) {
                            switch (child.$renderMode) {
                                case 1 /* NONE */:
                                    break;
                                case 2 /* FILTER */:
                                    drawCalls += this.drawWithFilter(child, buffer, offsetX2, offsetY2);
                                    break;
                                case 3 /* CLIP */:
                                    drawCalls += this.drawWithClip(child, buffer, offsetX2, offsetY2);
                                    break;
                                case 4 /* SCROLLRECT */:
                                    drawCalls += this.drawWithScrollRect(child, buffer, offsetX2, offsetY2);
                                    break;
                                case 5 /* SHADER_CLIP */:
                                    drawCalls += this.drawWithShaderClip(child, buffer, offsetX2, offsetY2);
                                    break;
                                case 6 /* STENCIL_CLIP */:
                                    drawCalls += this.drawWithStencilClip(child, buffer, offsetX2, offsetY2);
                                    break;
                                case 8 /* SCISSOR_CLIP */:
                                    drawCalls += this.drawWithScissorClip(child, buffer, offsetX2, offsetY2);
                                    break;
                                case 7 /* SHADER_DEPTH */:
                                    drawCalls += this.drawWithShaderDepthMask(child, buffer, offsetX2, offsetY2);
                                    break;
                                default:
                                    drawCalls += this.drawDisplayObject(child, buffer, offsetX2, offsetY2);
                                    break;
                            }
                        }
                        if (tempAlpha) {
                            buffer.globalAlpha = tempAlpha;
                        }
                        if (tempTintColor) {
                            buffer.globalTintColor = tempTintColor;
                        }
                        if (savedMatrix) {
                            var m = buffer.globalMatrix;
                            m.a = savedMatrix.a;
                            m.b = savedMatrix.b;
                            m.c = savedMatrix.c;
                            m.d = savedMatrix.d;
                            m.tx = savedMatrix.tx;
                            m.ty = savedMatrix.ty;
                            egret.Matrix.release(savedMatrix);
                        }
                    }
                }
                if (displayObject.bRenderLogicHierarchyEnable) {
                    if (this.m_objRenderLogicHierarchy.enable) {
                        this.m_objRenderLogicHierarchy.end();
                    }
                }
                if (displayObject.bRenderLogicLastRenderEnable) {
                    if (this.m_objRenderLogicLastRender.enable) {
                        this.m_objRenderLogicLastRender.end();
                    }
                }
                return drawCalls;
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.drawWithFilter = function (displayObject, buffer, offsetX, offsetY) {
                if (this.isCulled(displayObject)) {
                    buffer.$ocCulled++;
                    return 0;
                }
                buffer.$sprites++;
                var drawCalls = 0;
                if (displayObject.$children && displayObject.$children.length == 0 && (!displayObject.$renderNode || displayObject.$renderNode.$getRenderCount() == 0)) {
                    return drawCalls;
                }
                var filters = displayObject.$filters;
                var hasBlendMode = (displayObject.blendModeValue !== 0);
                var compositeOp;
                if (hasBlendMode) {
                    compositeOp = blendModes[displayObject.blendModeValue];
                    if (!compositeOp) {
                        compositeOp = defaultCompositeOpStack[defaultCompositeOpStack.length - 1];
                    }
                }
                var displayBounds = displayObject.$getOriginalBounds();
                var displayBoundsX = displayBounds.x;
                var displayBoundsY = displayBounds.y;
                var displayBoundsWidth = displayBounds.width;
                var displayBoundsHeight = displayBounds.height;
                if (displayBoundsWidth <= 0 || displayBoundsHeight <= 0) {
                    return drawCalls;
                }
                // +++++++++++++++++++++
                // 检查是否能跳过filter创建RT
                var skipFilterRT = false;
                if (filters.length == 1) {
                    var filter = filters[0];
                    if (filter.type == "colorTransform") {
                        skipFilterRT = true;
                    }
                    else if (filter.type == "glow") {
                        skipFilterRT = true;
                    }
                    else if (filter.type === "custom" && filters[0].padding === 0) {
                        skipFilterRT = true;
                    }
                }
                // 检查mask
                if (skipFilterRT) {
                    var childrenDrawCount = this.getRenderCount(displayObject);
                    if (!displayObject.$children || childrenDrawCount == 1) {
                        buffer.context.$filter = filters[0];
                        drawCalls = this.drawWithFilterEx(displayObject, buffer, offsetX, offsetY);
                        buffer.context.$filter = null;
                        return drawCalls;
                    }
                }
                // ---------------------
                // if (!displayObject.mask && filters.length == 1 && (filters[0].type == "colorTransform" || (filters[0].type === "custom" && (<CustomFilter>filters[0]).padding === 0))) {
                //     let childrenDrawCount = this.getRenderCount(displayObject);
                //     if (!displayObject.$children || childrenDrawCount == 1) {
                //         buffer.context.$filter = <ColorMatrixFilter>filters[0];
                //         if (displayObject.$mask) {
                //             drawCalls += this.drawWithClip(displayObject, buffer, offsetX, offsetY);
                //         }
                //         else if (displayObject.$scrollRect || displayObject.$maskRect) {
                //             drawCalls += this.drawWithScrollRect(displayObject, buffer, offsetX, offsetY);
                //         }
                //         else {
                //             drawCalls += this.drawDisplayObject(displayObject, buffer, offsetX, offsetY);
                //         }
                //         buffer.context.$filter = null;
                //         return drawCalls;
                //     }
                // }
                if (egret.sys.enableRecursionFilter) {
                    //递归实现，可能跟子节点Filter有冲突
                    if (skipFilterRT && displayObject instanceof egret.DisplayObjectContainer && displayObject.filterRecursion /** && !displayObject.mask && filters.length == 1 && filters[0].type == "colorTransform" */) {
                        buffer.context.$filter = filters[0];
                        // // for(let i=0; i<displayObject.$children.length; i++){
                        //     if (displayObject.$mask) {
                        //         drawCalls += this.drawWithClip(displayObject, buffer, offsetX, offsetY);
                        //     }
                        //     else if (displayObject.$scrollRect || displayObject.$maskRect) {
                        //         drawCalls += this.drawWithScrollRect(displayObject, buffer, offsetX, offsetY);
                        //     }
                        //     else {
                        //         drawCalls += this.drawDisplayObject(displayObject, buffer, offsetX, offsetY);
                        //     }
                        // // }
                        drawCalls = this.drawWithFilterEx(displayObject, buffer, offsetX, offsetY);
                        buffer.context.$filter = null;
                        return drawCalls;
                    }
                }
                // 为显示对象创建一个新的buffer
                var scale = Math.max(egret.sys.DisplayList.$canvasScaleFactor, 2);
                filters.forEach(function (filter) {
                    if (filter instanceof egret.GlowFilter || filter instanceof egret.BlurFilter) {
                        filter.$uniforms.$filterScale = scale;
                        if (filter.type == 'blur') {
                            var blurFilter = filter;
                            blurFilter.blurXFilter.$uniforms.$filterScale = scale;
                            blurFilter.blurYFilter.$uniforms.$filterScale = scale;
                        }
                    }
                });
                var displayBuffer = web.WebGLRenderBuffer.create(scale * displayBoundsWidth, scale * displayBoundsHeight);
                displayBuffer.saveTransform();
                displayBuffer.transform(scale, 0, 0, scale, 0, 0);
                displayBuffer.bufferMatrix.tx = displayBoundsX;
                displayBuffer.bufferMatrix.ty = displayBoundsY;
                displayObject.$getConcatenatedMatrix().$preMultiplyInto(displayBuffer.bufferMatrix, displayBuffer.bufferMatrix);
                displayBuffer.bufferMatrix.invert();
                displayBuffer.bufferMatrix.scale(scale, scale);
                //继承原有的alpha值
                displayBuffer.globalAlpha = buffer.globalAlpha;
                var displayBufferPushSuccess = displayBuffer.context.pushBuffer(displayBuffer);
                drawCalls += this.drawWithFilterEx(displayObject, displayBuffer, -displayBoundsX, -displayBoundsY);
                if (displayBufferPushSuccess) {
                    displayBuffer.context.popBuffer();
                }
                displayBuffer.restoreTransform();
                displayBuffer.bufferMatrix.copyFrom(displayBuffer.globalMatrix);
                //绘制结果到屏幕
                if (drawCalls > 0) {
                    // if (hasBlendMode) {
                    buffer.context.setGlobalCompositeOperation(compositeOp || defaultCompositeOpStack[defaultCompositeOpStack.length - 1]);
                    // }
                    drawCalls++;
                    // 绘制结果的时候，应用滤镜
                    buffer.$offsetX = offsetX + displayBoundsX;
                    buffer.$offsetY = offsetY + displayBoundsY;
                    var savedMatrix = egret.Matrix.create();
                    var curMatrix = buffer.globalMatrix;
                    savedMatrix.a = curMatrix.a;
                    savedMatrix.b = curMatrix.b;
                    savedMatrix.c = curMatrix.c;
                    savedMatrix.d = curMatrix.d;
                    savedMatrix.tx = curMatrix.tx;
                    savedMatrix.ty = curMatrix.ty;
                    buffer.useOffset();
                    buffer.context.drawTargetWidthFilters(filters, displayBuffer);
                    curMatrix.a = savedMatrix.a;
                    curMatrix.b = savedMatrix.b;
                    curMatrix.c = savedMatrix.c;
                    curMatrix.d = savedMatrix.d;
                    curMatrix.tx = savedMatrix.tx;
                    curMatrix.ty = savedMatrix.ty;
                    egret.Matrix.release(savedMatrix);
                    // if (hasBlendMode) {
                    //     buffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length-1]);
                    // }
                }
                web.WebGLRenderBuffer.release(displayBuffer);
                return drawCalls;
            };
            WebGLRenderer.prototype.drawWithFilterEx = function (displayObject, buffer, offsetX, offsetY) {
                var drawCalls = 0;
                if (displayObject.$mask) {
                    if (displayObject.scissorMask) {
                        drawCalls = this.drawWithScissorClip(displayObject, buffer, offsetX, offsetY);
                    }
                    else if (displayObject.$maskOpt && egret.getQualifiedClassName(displayObject.$mask) == 'eui.RectangleComponent') {
                        drawCalls = this.drawWithShaderClip(displayObject, buffer, offsetX, offsetY);
                    }
                    else {
                        drawCalls = this.drawWithClip(displayObject, buffer, offsetX, offsetY);
                    }
                }
                else if (displayObject.$scrollRect || displayObject.$maskRect) {
                    drawCalls = this.drawWithScrollRect(displayObject, buffer, offsetX, offsetY);
                }
                else {
                    drawCalls = this.drawDisplayObject(displayObject, buffer, offsetX, offsetY);
                }
                return drawCalls;
            };
            WebGLRenderer.prototype.getRenderCount = function (displayObject) {
                var drawCount = 0;
                var node = displayObject.$getRenderNode();
                if (node) {
                    drawCount += node.$getRenderCount();
                }
                if (displayObject.$children) {
                    for (var _i = 0, _a = displayObject.$children; _i < _a.length; _i++) {
                        var child = _a[_i];
                        var filters = child.$filters;
                        // 特殊处理有滤镜的对象
                        if (filters && filters.length > 0) {
                            return 2;
                        }
                        else if (child.$children) {
                            drawCount += this.getRenderCount(child);
                        }
                        else {
                            var node_1 = child.$getRenderNode();
                            if (node_1) {
                                drawCount += node_1.$getRenderCount();
                            }
                        }
                    }
                }
                return drawCount;
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.drawWithClip = function (displayObject, buffer, offsetX, offsetY) {
                if (this.isCulled(displayObject)) {
                    buffer.$ocCulled++;
                    return 0;
                }
                buffer.$sprites++;
                var drawCalls = 0;
                var hasBlendMode = (displayObject.blendModeValue !== 0);
                var compositeOp;
                if (hasBlendMode) {
                    compositeOp = blendModes[displayObject.blendModeValue];
                    if (!compositeOp) {
                        compositeOp = defaultCompositeOpStack[defaultCompositeOpStack.length - 1];
                    }
                }
                var scrollRect = displayObject.$scrollRect ? displayObject.$scrollRect : displayObject.$maskRect;
                var mask = displayObject.$mask;
                if (mask) {
                    var maskRenderMatrix = mask.$getMatrix();
                    //遮罩scaleX或scaleY为0，放弃绘制
                    if ((maskRenderMatrix.a == 0 && maskRenderMatrix.b == 0) || (maskRenderMatrix.c == 0 && maskRenderMatrix.d == 0)) {
                        return drawCalls;
                    }
                    if (egret.Capabilities.isEditor || egret.Capabilities.innerTest) {
                        var logTime = displayObject["_logtime"];
                        var nowTime = Date.now();
                        var logInternal = egret.Capabilities.isEditor ? 300000 : 1000;
                        //遮罩与本体没有交叠，放弃绘制
                        var bound = egret.$TempRectangle2;
                        displayObject.getOccludeeRect(bound);
                        var maskbound = egret.$TempRectangle3;
                        mask.getOccludeeRect(maskbound);
                        if (!maskbound.intersects(bound)) {
                            if (logTime == undefined || nowTime - logTime > logInternal) {
                                console.warn('Mask 节点没有交叠，可优化可见性' + (displayObject["id"] || displayObject.name_));
                            }
                            displayObject.markHasErrorInfo();
                        }
                        displayObject["_logtime"] = nowTime;
                    }
                }
                //没有遮罩,同时显示对象没有子项
                if (!mask && (!displayObject.$children || displayObject.$children.length == 0)) {
                    if (scrollRect) {
                        buffer.context.pushMask(scrollRect.x + offsetX, scrollRect.y + offsetY, scrollRect.width, scrollRect.height);
                    }
                    //绘制显示对象
                    // if (hasBlendMode) {
                    //     buffer.context.setGlobalCompositeOperation(compositeOp);
                    // }
                    drawCalls += this.drawDisplayObject(displayObject, buffer, offsetX, offsetY);
                    // if (hasBlendMode) {
                    //     buffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length-1]);
                    // }
                    if (scrollRect) {
                        buffer.context.popMask();
                    }
                    return drawCalls;
                }
                else {
                    var displayBounds = displayObject.$getOriginalBounds();
                    var displayBoundsX = displayBounds.x;
                    var displayBoundsY = displayBounds.y;
                    var displayBoundsWidth = displayBounds.width;
                    var displayBoundsHeight = displayBounds.height;
                    if (displayBoundsWidth <= 0 || displayBoundsHeight <= 0) {
                        return drawCalls;
                    }
                    //绘制显示对象自身，若有scrollRect，应用clip
                    var displayBuffer = web.WebGLRenderBuffer.create(displayBoundsWidth, displayBoundsHeight);
                    var displayBufferPushSuccess = displayBuffer.context.pushBuffer(displayBuffer);
                    displayBuffer.bufferMatrix.tx = displayBoundsX;
                    displayBuffer.bufferMatrix.ty = displayBoundsY;
                    displayObject.$getConcatenatedMatrix().$preMultiplyInto(displayBuffer.bufferMatrix, displayBuffer.bufferMatrix);
                    displayBuffer.bufferMatrix.invert();
                    drawCalls += this.drawDisplayObject(displayObject, displayBuffer, -displayBoundsX, -displayBoundsY);
                    //绘制遮罩
                    if (mask) {
                        var maskBuffer = web.WebGLRenderBuffer.create(displayBoundsWidth, displayBoundsHeight);
                        var maskBufferPushSuccess = maskBuffer.context.pushBuffer(maskBuffer);
                        var maskMatrix = egret.Matrix.create();
                        maskMatrix.copyFrom(mask.$getConcatenatedMatrix());
                        mask.$getConcatenatedMatrixAt(displayObject, maskMatrix);
                        maskMatrix.translate(-displayBoundsX, -displayBoundsY);
                        maskBuffer.setTransform(maskMatrix.a, maskMatrix.b, maskMatrix.c, maskMatrix.d, maskMatrix.tx, maskMatrix.ty);
                        egret.Matrix.release(maskMatrix);
                        drawCalls += this.drawDisplayObject(mask, maskBuffer, 0, 0);
                        if (maskBufferPushSuccess) {
                            maskBuffer.context.popBuffer();
                        }
                        displayBuffer.context.setGlobalCompositeOperation("destination-in");
                        displayBuffer.setTransform(1, 0, 0, -1, 0, maskBuffer.height);
                        var maskBufferWidth = maskBuffer.rootRenderTarget.width;
                        var maskBufferHeight = maskBuffer.rootRenderTarget.height;
                        displayBuffer.context.drawTexture(maskBuffer.rootRenderTarget.texture, 0, 0, maskBufferWidth, maskBufferHeight, 0, 0, maskBufferWidth, maskBufferHeight, maskBufferWidth, maskBufferHeight);
                        displayBuffer.setTransform(1, 0, 0, 1, 0, 0);
                        displayBuffer.context.setGlobalCompositeOperation("source-over");
                        maskBuffer.setTransform(1, 0, 0, 1, 0, 0);
                        web.WebGLRenderBuffer.release(maskBuffer);
                    }
                    // displayBuffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length-1]);
                    if (displayBufferPushSuccess) {
                        displayBuffer.context.popBuffer();
                    }
                    //绘制结果到屏幕
                    if (drawCalls > 0) {
                        drawCalls++;
                        // if (hasBlendMode) {
                        buffer.context.setGlobalCompositeOperation(compositeOp || defaultCompositeOpStack[defaultCompositeOpStack.length - 1]);
                        // }
                        if (scrollRect) {
                            buffer.context.pushMask(scrollRect.x + offsetX, scrollRect.y + offsetY, scrollRect.width, scrollRect.height);
                        }
                        var savedMatrix = egret.Matrix.create();
                        var curMatrix = buffer.globalMatrix;
                        savedMatrix.a = curMatrix.a;
                        savedMatrix.b = curMatrix.b;
                        savedMatrix.c = curMatrix.c;
                        savedMatrix.d = curMatrix.d;
                        savedMatrix.tx = curMatrix.tx;
                        savedMatrix.ty = curMatrix.ty;
                        curMatrix.append(1, 0, 0, -1, offsetX + displayBoundsX, offsetY + displayBoundsY + displayBuffer.height);
                        var displayBufferWidth = displayBuffer.rootRenderTarget.width;
                        var displayBufferHeight = displayBuffer.rootRenderTarget.height;
                        buffer.context.drawTexture(displayBuffer.rootRenderTarget.texture, 0, 0, displayBufferWidth, displayBufferHeight, 0, 0, displayBufferWidth, displayBufferHeight, displayBufferWidth, displayBufferHeight);
                        if (scrollRect) {
                            displayBuffer.context.popMask();
                        }
                        // if (hasBlendMode) {
                        //     buffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length-1]);
                        // }
                        var matrix = buffer.globalMatrix;
                        matrix.a = savedMatrix.a;
                        matrix.b = savedMatrix.b;
                        matrix.c = savedMatrix.c;
                        matrix.d = savedMatrix.d;
                        matrix.tx = savedMatrix.tx;
                        matrix.ty = savedMatrix.ty;
                        egret.Matrix.release(savedMatrix);
                    }
                    web.WebGLRenderBuffer.release(displayBuffer);
                    return drawCalls;
                }
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.drawWithScrollRect = function (displayObject, buffer, offsetX, offsetY) {
                if (this.isCulled(displayObject)) {
                    buffer.$ocCulled++;
                    return 0;
                }
                buffer.$sprites++;
                var drawCalls = 0;
                var scrollRect = displayObject.$scrollRect ? displayObject.$scrollRect : displayObject.$maskRect;
                if (scrollRect.isEmpty()) {
                    return drawCalls;
                }
                if (displayObject.$scrollRect) {
                    offsetX -= scrollRect.x;
                    offsetY -= scrollRect.y;
                }
                var m = buffer.globalMatrix;
                var context = buffer.context;
                var scissor = false;
                var maskTextre = null;
                if (buffer.$hasScissor || m.b != 0 || m.c != 0) { // 有旋转的情况下不能使用scissor
                    buffer.context.pushMask(scrollRect.x + offsetX, scrollRect.y + offsetY, scrollRect.width, scrollRect.height);
                }
                else {
                    var a = m.a;
                    var d = m.d;
                    var tx = m.tx;
                    var ty = m.ty;
                    var x = scrollRect.x + offsetX;
                    var y = scrollRect.y + offsetY;
                    var xMax = x + scrollRect.width;
                    var yMax = y + scrollRect.height;
                    var minX = void 0, minY = void 0, maxX = void 0, maxY = void 0;
                    //优化，通常情况下不缩放的对象占多数，直接加上偏移量即可。
                    if (a == 1.0 && d == 1.0) {
                        minX = x + tx;
                        minY = y + ty;
                        maxX = xMax + tx;
                        maxY = yMax + ty;
                    }
                    else {
                        var x0 = a * x + tx;
                        var y0 = d * y + ty;
                        var x1 = a * xMax + tx;
                        var y1 = d * y + ty;
                        var x2 = a * xMax + tx;
                        var y2 = d * yMax + ty;
                        var x3 = a * x + tx;
                        var y3 = d * yMax + ty;
                        var tmp = 0;
                        if (x0 > x1) {
                            tmp = x0;
                            x0 = x1;
                            x1 = tmp;
                        }
                        if (x2 > x3) {
                            tmp = x2;
                            x2 = x3;
                            x3 = tmp;
                        }
                        minX = (x0 < x2 ? x0 : x2);
                        maxX = (x1 > x3 ? x1 : x3);
                        if (y0 > y1) {
                            tmp = y0;
                            y0 = y1;
                            y1 = tmp;
                        }
                        if (y2 > y3) {
                            tmp = y2;
                            y2 = y3;
                            y3 = tmp;
                        }
                        minY = (y0 < y2 ? y0 : y2);
                        maxY = (y1 > y3 ? y1 : y3);
                    }
                    /**
                     * #57293 【自主】【引擎】进度条显示精度优化
                     * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/scissor
                     * scissor(x, y, width, height)
                     * x A GLint specifying the horizontal coordinate for the lower left corner of the box. Default value: 0.
                     * y A GLint specifying the vertical coordinate for the lower left corner of the box. Default value: 0.
                     * width A non-negative GLsizei specifying the width of the scissor box. Default value: width of the canvas.
                     * height A non-negative GLsizei specifying the height of the scissor box. Default value: height of the canvas.
                     * 其中 GLin long 32-bit twos complement signed integer.
                     */
                    var sX = Math.floor(minX);
                    var sY = Math.floor(-maxY + buffer.height);
                    var sW = Math.ceil(maxX - minX);
                    var sH = Math.ceil(maxY - minY);
                    context.enableScissor(sX, sY, sW, sH);
                    scissor = true;
                }
                drawCalls += this.drawDisplayObject(displayObject, buffer, offsetX, offsetY);
                if (scissor) {
                    context.disableScissor();
                }
                else {
                    context.popMask();
                }
                return drawCalls;
            };
            /**
             * mike add
             * @param displayObject
             * @param buffer
             * @param offsetX
             * @param offsetY
             * @returns
             */
            WebGLRenderer.prototype.drawWithScissorClip = function (displayObject, buffer, offsetX, offsetY) {
                if (this.isCulled(displayObject)) {
                    buffer.$ocCulled++;
                    return 0;
                }
                var mask = displayObject.$mask;
                var maskName = egret.getQualifiedClassName(mask);
                if (maskName == 'eui.RectangleComponent' || maskName == 'eui.Rect' || maskName == 'eui.SdfRect' || maskName == 'eui.CLogicPrimitiveRect') { // 限制矩形
                    // pass
                }
                else {
                    displayObject.scissorMask = false;
                    return 0;
                }
                var m = buffer.globalMatrix;
                var context = buffer.context;
                if (buffer.$hasScissor || m.b != 0 || m.c != 0) { // 有旋转的情况下不能使用scissor
                    displayObject.scissorMask = false;
                    return 0;
                }
                var drawCalls = 0;
                var maskGlobalPoint = mask.localToGlobal();
                var maskToDisplayObjectPoint = displayObject.globalToLocal(maskGlobalPoint.x, maskGlobalPoint.y);
                // let maskRect = new Rectangle(maskGlobalPoint.x - offsetX || 0, maskGlobalPoint.y - offsetY || 0, mask.width || 0, mask.height || 0);
                var maskRect = new egret.Rectangle(maskToDisplayObjectPoint.x || 0, maskToDisplayObjectPoint.y || 0, mask.width || 0, mask.height || 0);
                if (maskRect.isEmpty()) {
                    return drawCalls;
                }
                var originOffsetX = offsetX;
                var originOffsetY = offsetY;
                // offsetX -= maskRect.x;
                // offsetY -= maskRect.y;
                buffer.$sprites++;
                var a = m.a;
                var d = m.d;
                var tx = m.tx;
                var ty = m.ty;
                var x = maskRect.x + offsetX;
                var y = maskRect.y + offsetY;
                var xMax = x + maskRect.width;
                var yMax = y + maskRect.height;
                var minX, minY, maxX, maxY;
                //优化，通常情况下不缩放的对象占多数，直接加上偏移量即可。
                if (a == 1.0 && d == 1.0) {
                    minX = x + tx;
                    minY = y + ty;
                    maxX = xMax + tx;
                    maxY = yMax + ty;
                }
                else {
                    var x0 = a * x + tx;
                    var y0 = d * y + ty;
                    var x1 = a * xMax + tx;
                    var y1 = d * y + ty;
                    var x2 = a * xMax + tx;
                    var y2 = d * yMax + ty;
                    var x3 = a * x + tx;
                    var y3 = d * yMax + ty;
                    var tmp = 0;
                    if (x0 > x1) {
                        tmp = x0;
                        x0 = x1;
                        x1 = tmp;
                    }
                    if (x2 > x3) {
                        tmp = x2;
                        x2 = x3;
                        x3 = tmp;
                    }
                    minX = (x0 < x2 ? x0 : x2);
                    maxX = (x1 > x3 ? x1 : x3);
                    if (y0 > y1) {
                        tmp = y0;
                        y0 = y1;
                        y1 = tmp;
                    }
                    if (y2 > y3) {
                        tmp = y2;
                        y2 = y3;
                        y3 = tmp;
                    }
                    minY = (y0 < y2 ? y0 : y2);
                    maxY = (y1 > y3 ? y1 : y3);
                }
                context.enableScissor(minX, -maxY + buffer.height, maxX - minX, maxY - minY);
                drawCalls += this.drawDisplayObject(displayObject, buffer, originOffsetX, originOffsetY);
                context.disableScissor();
                return drawCalls;
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.drawWithShaderClip = function (displayObject, buffer, offsetX, offsetY) {
                if (this.isCulled(displayObject)) {
                    buffer.$ocCulled++;
                    return 0;
                }
                buffer.$sprites++;
                var drawCalls = 0;
                var mask = displayObject.$mask;
                if (!mask) {
                    return drawCalls;
                }
                if (mask) {
                    var maskRenderMatrix = mask.$getMatrix();
                    //遮罩scaleX或scaleY为0，放弃绘制
                    if ((maskRenderMatrix.a == 0 && maskRenderMatrix.b == 0) || (maskRenderMatrix.c == 0 && maskRenderMatrix.d == 0)) {
                        return drawCalls;
                    }
                    if (egret.Capabilities.isEditor || egret.Capabilities.innerTest) {
                        var logTime = displayObject["_logtime"];
                        var nowTime = Date.now();
                        var logInternal = egret.Capabilities.isEditor ? 300000 : 1000;
                        //遮罩与本体没有交叠，放弃绘制
                        var bound = egret.$TempRectangle2;
                        displayObject.getOccludeeRect(bound);
                        var maskbound = egret.$TempRectangle3;
                        mask.getOccludeeRect(maskbound);
                        if (!maskbound.intersects(bound)) {
                            if (logTime == undefined || nowTime - logTime > logInternal) {
                                console.warn('Mask 节点没有交叠，可优化可见性' + (displayObject["id"] || displayObject.name_));
                            }
                            displayObject.markHasErrorInfo();
                        }
                        displayObject["_logtime"] = nowTime;
                    }
                }
                var maskMatrix = egret.Matrix.create();
                var node;
                var matdirty = mask.$renderDirty;
                if (mask.$renderDirty) {
                    node = mask.$getRenderNode();
                }
                else {
                    node = mask.$renderNode;
                }
                if (!node) {
                    return drawCalls;
                }
                var texture;
                var uv2Clamp;
                if (node.type == 6 /* NormalBitmapNode */) {
                    var image = void 0;
                    var bitmapnode = node;
                    image = bitmapnode.image;
                    if (!image) {
                        if (bitmapnode.bitmap && bitmapnode.bitmap instanceof egret.Bitmap) {
                            bitmapnode.bitmap.$refreshImageData();
                            bitmapnode.bitmap.markDirtyUp();
                        }
                    }
                    else if (!image.valid()) {
                        image.reload(bitmapnode.bitmap);
                    }
                    if (!image || !image.valid()) {
                        return drawCalls;
                    }
                    texture = buffer.context.getWebGLTexture(image);
                    // cache this matrix calculation
                    var cm = mask.$getConcatenatedMatrix();
                    // cm.$preMultiplyInto(maskMatrix, maskMatrix); // from mask local to world;
                    buffer.bufferMatrix.$preMultiplyInto(cm, maskMatrix); // from mask local to screen;
                    maskMatrix.invert(); // from screen to mask local space
                    if (matdirty || mask.matLocalToUV === undefined) {
                        var localToXY = egret.Matrix.create();
                        localToXY.setTo(1, 0, 0, 1, bitmapnode.drawX, bitmapnode.drawY);
                        localToXY.invert();
                        var w = bitmapnode.imageWidth;
                        var h = bitmapnode.imageHeight;
                        var a = bitmapnode.sourceW / w;
                        var d = bitmapnode.sourceH / h;
                        var tx = bitmapnode.sourceX / w;
                        var ty = bitmapnode.sourceY / h;
                        mask.matLocalToUV = new egret.Matrix(a / bitmapnode.drawW, 0, 0, d / bitmapnode.drawH, tx, ty);
                        mask.matLocalToUV.$preMultiplyInto(localToXY, mask.matLocalToUV);
                        mask.uv2Clamp = [tx, ty, a + tx, d + ty];
                        egret.Matrix.release(localToXY);
                    }
                    mask.matLocalToUV.$preMultiplyInto(maskMatrix, maskMatrix); // from screen space to mask uv space
                    uv2Clamp = mask.uv2Clamp;
                }
                else if (node.type == 3 /* GraphicsNode */) {
                    var graphicsnode = node;
                    if (graphicsnode.width <= 0 || graphicsnode.height <= 0 || !graphicsnode.width || !graphicsnode.height || node.drawData.length == 0) {
                        return drawCalls;
                    }
                    matdirty = graphicsnode.dirtyRender;
                    this.renderGraphics(graphicsnode, buffer, false, true);
                    texture = graphicsnode.$texture;
                    // cache this matrix calculation
                    // maskMatrix.setTo(1, 0, 0, 1, graphicsnode.x, graphicsnode.y);
                    var cm = mask.$getConcatenatedMatrix();
                    // mask.$getConcatenatedMatrix().$preMultiplyInto(maskMatrix, maskMatrix); // from mask local to world;
                    buffer.bufferMatrix.$preMultiplyInto(cm, maskMatrix); // from mask local to screen;
                    maskMatrix.invert(); // from screen to mask local space
                    if (matdirty || mask.matLocalToUV === undefined) {
                        var localToXY = egret.Matrix.create();
                        localToXY.setTo(1, 0, 0, 1, graphicsnode.x, graphicsnode.y);
                        localToXY.invert();
                        var a = 1.0;
                        var d = 1.0;
                        var tx = 0;
                        var ty = 0;
                        mask.matLocalToUV = new egret.Matrix(a / graphicsnode.width, 0, 0, d / graphicsnode.height, tx, ty);
                        mask.matLocalToUV.$preMultiplyInto(localToXY, mask.matLocalToUV); // from screen space to mask uv space
                        mask.uv2Clamp = [tx, ty, a + tx, d + ty];
                        egret.Matrix.release(localToXY);
                    }
                    mask.matLocalToUV.$preMultiplyInto(maskMatrix, maskMatrix);
                    uv2Clamp = mask.uv2Clamp;
                }
                // 当node存在且既不是Bitmapnode 或者 GraphicsNode，说明配置有误，切换回老的渲染模式
                else {
                    displayObject.maskOpt = false;
                    if (egret.Capabilities.isEditor || egret.Capabilities.innerTest) {
                        console.warn('当前mask不支持开启maskOpt:' + (displayObject["id"] || displayObject.name_));
                    }
                    return;
                }
                mask.$getOriginalBounds();
                buffer.context.pushMaskTex(texture, maskMatrix, uv2Clamp, mask.allowUV2Clamp, buffer);
                egret.Matrix.release(maskMatrix); // 放心，上面那个接口是clone了matrix，这里release也不会有问题
                // 修改默认的混合模式，使得NormalBitmapNode等子节点也能生效，切记要在最后还原
                var hasBlendMode = (displayObject.blendModeValue !== 0);
                var compositeOp;
                if (hasBlendMode) {
                    compositeOp = blendModes[displayObject.blendModeValue];
                    if (compositeOp) {
                        defaultCompositeOpStack.push(compositeOp);
                    }
                }
                buffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length - 1]);
                drawCalls += this.drawDisplayObject(displayObject, buffer, offsetX, offsetY);
                if (compositeOp) {
                    defaultCompositeOpStack.pop();
                }
                buffer.context.popMaskTex();
                return drawCalls;
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.drawWithStencilClip = function (displayObject, buffer, offsetX, offsetY) {
                if (this.isCulled(displayObject)) {
                    buffer.$ocCulled++;
                    return 0;
                }
                buffer.$sprites++;
                var drawCalls = 0;
                var mask = displayObject.$mask;
                if (!mask) {
                    return drawCalls;
                }
                if (mask) {
                    var maskRenderMatrix = mask.$getMatrix();
                    //遮罩scaleX或scaleY为0，放弃绘制
                    if ((maskRenderMatrix.a == 0 && maskRenderMatrix.b == 0) || (maskRenderMatrix.c == 0 && maskRenderMatrix.d == 0)) {
                        return drawCalls;
                    }
                    if (egret.Capabilities.isEditor || egret.Capabilities.innerTest) {
                        var logTime = displayObject["_logtime"];
                        var nowTime = Date.now();
                        var logInternal = egret.Capabilities.isEditor ? 300000 : 1000;
                        //遮罩与本体没有交叠，放弃绘制
                        var bound = egret.$TempRectangle2;
                        displayObject.getOccludeeRect(bound);
                        var maskbound = egret.$TempRectangle3;
                        mask.getOccludeeRect(maskbound);
                        if (!maskbound.intersects(bound)) {
                            if (logTime == undefined || nowTime - logTime > logInternal) {
                                console.warn('Mask 节点没有交叠，可优化可见性' + (displayObject["id"] || displayObject.name_));
                            }
                            displayObject.markHasErrorInfo();
                        }
                        displayObject["_logtime"] = nowTime;
                    }
                }
                var maskMatrix = egret.Matrix.create();
                maskMatrix.copyFrom(mask.$getConcatenatedMatrix());
                mask.$getConcatenatedMatrixAt(displayObject, maskMatrix);
                var offsetX2 = offsetX + maskMatrix.tx;
                var offsetY2 = offsetY + maskMatrix.ty;
                buffer.context.pushStencilMaskBegin();
                drawCalls += this.drawDisplayObject(mask, buffer, offsetX2, offsetY2);
                buffer.context.pushStencilMaskEnd();
                drawCalls += this.drawDisplayObject(displayObject, buffer, offsetX, offsetY);
                buffer.context.popStencilMaskBegin();
                drawCalls += this.drawDisplayObject(mask, buffer, offsetX2, offsetY2);
                buffer.context.popStencilMaskEnd();
                egret.Matrix.release(maskMatrix);
                return drawCalls;
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.drawWithShaderDepthMask = function (displayObject, buffer, offsetX, offsetY) {
                if (this.isCulled(displayObject)) {
                    buffer.$ocCulled++;
                    return 0;
                }
                buffer.$sprites++;
                var drawCalls = 0;
                var depthMasks = displayObject.$depthMaskObjs;
                if (!depthMasks) {
                    return drawCalls;
                }
                var curNode;
                if (displayObject.$renderDirty) {
                    curNode = displayObject.$getRenderNode();
                }
                else {
                    curNode = displayObject.$renderNode;
                }
                if (!curNode || curNode.type != 6 /* NormalBitmapNode */) {
                    return drawCalls;
                }
                var curBitmapNode = curNode;
                // let localToXY = Matrix.create();
                // localToXY.setTo(1, 0, 0, 1, -curBitmapNode.drawX, -curBitmapNode.drawY);
                var w = curBitmapNode.imageWidth;
                var h = curBitmapNode.imageHeight;
                var a = curBitmapNode.sourceW / w;
                var d = curBitmapNode.sourceH / h;
                var tx = curBitmapNode.sourceX / w;
                var ty = curBitmapNode.sourceY / h;
                // 支持一下缩放吧
                var drawW = curBitmapNode.drawW * displayObject.scaleX;
                var drawH = curBitmapNode.drawH * displayObject.scaleY;
                var drawX = curBitmapNode.drawX * displayObject.scaleX;
                var drawY = curBitmapNode.drawY * displayObject.scaleY;
                var matUVToLocal = egret.Matrix.create();
                matUVToLocal.setTo(a / drawW, 0, 0, d / drawH, tx, ty);
                matUVToLocal.invert();
                displayObject.$depthMaskInfoCache = [];
                for (var _i = 0, depthMasks_1 = depthMasks; _i < depthMasks_1.length; _i++) {
                    var depthObj = depthMasks_1[_i];
                    var node = void 0;
                    if (depthObj.$renderDirty) {
                        node = depthObj.$getRenderNode();
                    }
                    else {
                        node = depthObj.$renderNode;
                    }
                    if (!node || node.type != 6 /* NormalBitmapNode */) {
                        return drawCalls;
                    }
                    var bitmapnode = node;
                    var image = bitmapnode.image;
                    if (!image) {
                        if (bitmapnode.bitmap && bitmapnode.bitmap instanceof egret.Bitmap) {
                            bitmapnode.bitmap.$refreshImageData();
                            bitmapnode.bitmap.markDirtyUp();
                        }
                    }
                    else if (!image.valid()) {
                        image.reload(bitmapnode.bitmap);
                    }
                    if (!image || !image.valid()) {
                        return drawCalls;
                    }
                    var drawW2 = bitmapnode.drawW * depthObj.scaleX;
                    var drawH2 = bitmapnode.drawH * depthObj.scaleY;
                    var drawX2 = bitmapnode.drawX * depthObj.scaleX;
                    var drawY2 = bitmapnode.drawY * depthObj.scaleY;
                    var texture = buffer.context.getWebGLTexture(image);
                    var localToXY = egret.Matrix.create();
                    localToXY.setTo(1, 0, 0, 1, drawX - drawX2, drawY - drawY2);
                    var w_1 = bitmapnode.imageWidth;
                    var h_1 = bitmapnode.imageHeight;
                    var a_2 = bitmapnode.sourceW / w_1;
                    var d_1 = bitmapnode.sourceH / h_1;
                    var tx_1 = bitmapnode.sourceX / w_1;
                    var ty_1 = bitmapnode.sourceY / h_1;
                    var matLocalToMaskUV = new egret.Matrix(a_2 / drawW2, 0, 0, d_1 / drawH2, tx_1, ty_1);
                    matLocalToMaskUV.$preMultiplyInto(localToXY, matLocalToMaskUV);
                    matLocalToMaskUV.$preMultiplyInto(matUVToLocal, matLocalToMaskUV);
                    egret.Matrix.release(localToXY);
                    var info = {};
                    info.texture = texture;
                    info.uvInfo = matLocalToMaskUV;
                    info.uvClamp = [tx_1, ty_1, a_2 + tx_1, d_1 + ty_1];
                    displayObject.$depthMaskInfoCache.push(info);
                }
                egret.Matrix.release(matUVToLocal);
                drawCalls += this.drawDisplayObject(displayObject, buffer, offsetX, offsetY);
                return drawCalls;
            };
            /**
             * 将一个RenderNode对象绘制到渲染缓冲
             * @param node 要绘制的节点
             * @param buffer 渲染缓冲
             * @param matrix 要叠加的矩阵
             * @param forHitTest 绘制结果是用于碰撞检测。若为true，当渲染GraphicsNode时，会忽略透明度样式设置，全都绘制为不透明的。
             */
            WebGLRenderer.prototype.drawNodeToBuffer = function (node, buffer, matrix, forHitTest) {
                var webglBuffer = buffer;
                //pushRenderTARGET
                var bufferPushSuccess = webglBuffer.context.pushBuffer(webglBuffer);
                webglBuffer.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
                this.renderNode(node, buffer, 0, 0, forHitTest);
                webglBuffer.context.$drawWebGL();
                webglBuffer.onRenderFinish();
                //popRenderTARGET
                if (bufferPushSuccess) {
                    webglBuffer.context.popBuffer();
                }
            };
            /**
             * 将一个DisplayObject绘制到渲染缓冲，用于RenderTexture绘制
             * @param displayObject 要绘制的显示对象
             * @param buffer 渲染缓冲
             * @param matrix 要叠加的矩阵
             */
            WebGLRenderer.prototype.drawDisplayToBuffer = function (displayObject, buffer, matrix) {
                var bufferPushSuccess = buffer.context.pushBuffer(buffer);
                if (matrix) {
                    buffer.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
                }
                var node;
                if (displayObject.$renderDirty) {
                    node = displayObject.$getRenderNode();
                }
                else {
                    node = displayObject.$renderNode;
                }
                var drawCalls = 0;
                if (node) {
                    drawCalls++;
                    switch (node.type) {
                        case 1 /* BitmapNode */:
                            this.renderBitmap(node, buffer);
                            break;
                        case 2 /* TextNode */:
                            this.renderText(node, buffer);
                            break;
                        case 3 /* GraphicsNode */:
                            this.renderGraphics(node, buffer);
                            break;
                        case 4 /* GroupNode */:
                            this.renderGroup(node, buffer);
                            break;
                        case 5 /* MeshNode */:
                            this.renderMesh(node, buffer);
                            break;
                        case 6 /* NormalBitmapNode */:
                            this.renderNormalBitmap(node, buffer);
                            break;
                    }
                }
                var children = displayObject.$children;
                if (children) {
                    var length_8 = children.length;
                    for (var i = 0; i < length_8; i++) {
                        var child = children[i];
                        switch (child.$renderMode) {
                            case 1 /* NONE */:
                                break;
                            case 2 /* FILTER */:
                                drawCalls += this.drawWithFilter(child, buffer, 0, 0);
                                break;
                            case 3 /* CLIP */:
                                drawCalls += this.drawWithClip(child, buffer, 0, 0);
                                break;
                            case 4 /* SCROLLRECT */:
                                drawCalls += this.drawWithScrollRect(child, buffer, 0, 0);
                                break;
                            case 5 /* SHADER_CLIP */:
                                drawCalls += this.drawWithShaderClip(child, buffer, 0, 0);
                                break;
                            case 6 /* STENCIL_CLIP */:
                                drawCalls += this.drawWithStencilClip(child, buffer, 0, 0);
                                break;
                            case 8 /* SCISSOR_CLIP */:
                                drawCalls += this.drawWithScissorClip(child, buffer, 0, 0);
                                break;
                            case 7 /* SHADER_DEPTH */:
                                drawCalls += this.drawWithShaderDepthMask(child, buffer, 0, 0);
                                break;
                            default:
                                drawCalls += this.drawDisplayObject(child, buffer, 0, 0);
                                break;
                        }
                    }
                }
                buffer.context.$drawWebGL();
                buffer.onRenderFinish();
                if (bufferPushSuccess) {
                    buffer.context.popBuffer();
                }
                return drawCalls;
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.renderNode = function (node, buffer, offsetX, offsetY, forHitTest, depthMasks) {
                buffer.$offsetX = offsetX;
                buffer.$offsetY = offsetY;
                switch (node.type) {
                    case 1 /* BitmapNode */:
                        this.renderBitmap(node, buffer);
                        break;
                    case 2 /* TextNode */:
                        this.renderText(node, buffer);
                        break;
                    case 3 /* GraphicsNode */:
                        this.renderGraphics(node, buffer, forHitTest);
                        break;
                    case 4 /* GroupNode */:
                        this.renderGroup(node, buffer);
                        break;
                    case 5 /* MeshNode */:
                        this.renderMesh(node, buffer);
                        break;
                    case 6 /* NormalBitmapNode */:
                        this.renderNormalBitmap(node, buffer, undefined, depthMasks);
                        break;
                }
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.renderNormalBitmap = function (node, buffer, compositeOp, depthMasks) {
                var image = node.image;
                if (!image) {
                    if (node.bitmap && node.bitmap instanceof egret.Bitmap) {
                        node.bitmap.$refreshImageData();
                        node.bitmap.markDirtyUp();
                    }
                    return;
                }
                if (!image.valid()) {
                    image.reload(node.bitmap);
                    if (!image.valid()) {
                        return;
                    }
                }
                buffer.context.setGlobalCompositeOperation(compositeOp || defaultCompositeOpStack[defaultCompositeOpStack.length - 1]);
                if (this.m_objRenderLogicLastRender.enable && node.bRenderLogicLastRender) { // 高优先级
                    this.m_objRenderLogicLastRender.addRenderImageCache(buffer, image, node, depthMasks);
                }
                else if (this.m_objRenderLogicHierarchy.enable && node.nRenderLogicHierarchy) {
                    this.m_objRenderLogicHierarchy.drawImage(buffer, image, node, depthMasks);
                }
                else {
                    buffer.context.drawImage(image, node.sourceX, node.sourceY, node.sourceW, node.sourceH, node.drawX, node.drawY, node.drawW, node.drawH, node.imageWidth, node.imageHeight, node.rotated, node.smoothing, depthMasks);
                }
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.renderBitmap = function (node, buffer) {
                var image = node.image;
                if (!image) {
                    if (node.bitmap && node.bitmap instanceof egret.Bitmap) {
                        node.bitmap.$refreshImageData();
                        node.bitmap.markDirtyUp();
                    }
                    return;
                }
                if (!image.valid()) {
                    image.reload(node.bitmap);
                    if (!image.valid()) {
                        return;
                    }
                }
                //buffer.imageSmoothingEnabled = node.smoothing;
                var data = node.drawData;
                var length = data.length;
                var pos = 0;
                var m = node.matrix;
                var blendMode = node.blendMode;
                var alpha = node.alpha;
                var savedMatrix;
                var offsetX;
                var offsetY;
                if (m) {
                    savedMatrix = egret.Matrix.create();
                    var curMatrix = buffer.globalMatrix;
                    savedMatrix.a = curMatrix.a;
                    savedMatrix.b = curMatrix.b;
                    savedMatrix.c = curMatrix.c;
                    savedMatrix.d = curMatrix.d;
                    savedMatrix.tx = curMatrix.tx;
                    savedMatrix.ty = curMatrix.ty;
                    offsetX = buffer.$offsetX;
                    offsetY = buffer.$offsetY;
                    buffer.useOffset();
                    buffer.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
                }
                //这里不考虑嵌套
                buffer.context.setGlobalCompositeOperation(blendMode ? blendModes[blendMode] : defaultCompositeOpStack[defaultCompositeOpStack.length - 1]);
                var originAlpha;
                if (alpha == alpha) {
                    originAlpha = buffer.globalAlpha;
                    buffer.globalAlpha *= alpha;
                }
                if (node.filter) {
                    buffer.context.$filter = node.filter;
                    while (pos < length) {
                        buffer.context.drawImage(image, data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], node.imageWidth, node.imageHeight, node.rotated, node.smoothing);
                    }
                    buffer.context.$filter = null;
                }
                else {
                    while (pos < length) {
                        buffer.context.drawImage(image, data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], node.imageWidth, node.imageHeight, node.rotated, node.smoothing);
                    }
                }
                // if (blendMode) {
                //     buffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length-1]);
                // }
                if (alpha == alpha) {
                    buffer.globalAlpha = originAlpha;
                }
                if (m) {
                    var matrix = buffer.globalMatrix;
                    matrix.a = savedMatrix.a;
                    matrix.b = savedMatrix.b;
                    matrix.c = savedMatrix.c;
                    matrix.d = savedMatrix.d;
                    matrix.tx = savedMatrix.tx;
                    matrix.ty = savedMatrix.ty;
                    buffer.$offsetX = offsetX;
                    buffer.$offsetY = offsetY;
                    egret.Matrix.release(savedMatrix);
                }
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.renderMesh = function (node, buffer, compositeOp) {
                var image = node.image;
                //buffer.imageSmoothingEnabled = node.smoothing;
                var data = node.drawData;
                var length = data.length;
                var pos = 0;
                var m = node.matrix;
                var blendMode = node.blendMode;
                var alpha = node.alpha;
                var savedMatrix;
                var offsetX;
                var offsetY;
                if (m) {
                    savedMatrix = egret.Matrix.create();
                    var curMatrix = buffer.globalMatrix;
                    savedMatrix.a = curMatrix.a;
                    savedMatrix.b = curMatrix.b;
                    savedMatrix.c = curMatrix.c;
                    savedMatrix.d = curMatrix.d;
                    savedMatrix.tx = curMatrix.tx;
                    savedMatrix.ty = curMatrix.ty;
                    offsetX = buffer.$offsetX;
                    offsetY = buffer.$offsetY;
                    buffer.useOffset();
                    buffer.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
                }
                //这里不考虑嵌套
                // buffer.context.setGlobalCompositeOperation(blendMode ? blendModes[blendMode] : defaultCompositeOpStack[defaultCompositeOpStack.length-1]);
                buffer.context.setGlobalCompositeOperation(compositeOp || defaultCompositeOpStack[defaultCompositeOpStack.length - 1]);
                var originAlpha;
                if (alpha == alpha) {
                    originAlpha = buffer.globalAlpha;
                    buffer.globalAlpha *= alpha;
                }
                if (node.filter) {
                    buffer.context.$filter = node.filter;
                    while (pos < length) {
                        buffer.context.drawMesh(image, data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], node.imageWidth, node.imageHeight, node.uvs, node.vertices, node.indices, node.bounds, node.rotated, node.smoothing, node.colors);
                    }
                    buffer.context.$filter = null;
                }
                else {
                    while (pos < length) {
                        buffer.context.drawMesh(image, data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], data[pos++], node.imageWidth, node.imageHeight, node.uvs, node.vertices, node.indices, node.bounds, node.rotated, node.smoothing, node.colors);
                    }
                }
                // if (blendMode) {
                //     buffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length-1]);
                // }
                if (alpha == alpha) {
                    buffer.globalAlpha = originAlpha;
                }
                if (m) {
                    var matrix = buffer.globalMatrix;
                    matrix.a = savedMatrix.a;
                    matrix.b = savedMatrix.b;
                    matrix.c = savedMatrix.c;
                    matrix.d = savedMatrix.d;
                    matrix.tx = savedMatrix.tx;
                    matrix.ty = savedMatrix.ty;
                    buffer.$offsetX = offsetX;
                    buffer.$offsetY = offsetY;
                    egret.Matrix.release(savedMatrix);
                }
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.___renderText____ = function (node, buffer) {
                var width = node.width - node.x;
                var height = node.height - node.y;
                if (width <= 0 || height <= 0 || !width || !height || node.drawData.length === 0) {
                    return;
                }
                buffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length - 1]);
                var canvasScaleX = egret.sys.DisplayList.$canvasScaleX > 1 ? egret.sys.DisplayList.$canvasScaleX : 1 / egret.sys.DisplayList.$canvasScaleX;
                var canvasScaleY = egret.sys.DisplayList.$canvasScaleY > 1 ? egret.sys.DisplayList.$canvasScaleY : 1 / egret.sys.DisplayList.$canvasScaleY;
                var maxTextureSize = buffer.context.$maxTextureSize;
                if (width * canvasScaleX > maxTextureSize) {
                    canvasScaleX *= maxTextureSize / (width * canvasScaleX);
                }
                if (height * canvasScaleY > maxTextureSize) {
                    canvasScaleY *= maxTextureSize / (height * canvasScaleY);
                }
                var x = node.x;
                var y = node.y;
                if (node.$canvasScaleX !== canvasScaleX || node.$canvasScaleY !== canvasScaleY) {
                    node.$canvasScaleX = canvasScaleX;
                    node.$canvasScaleY = canvasScaleY;
                    node.dirtyRender = true;
                }
                if (node.dirtyRender || node.$atlasMainPage !== egret.textAtlasMainPage) {
                    //需要在analysis之前记录main page
                    node.$atlasMainPage = egret.textAtlasMainPage;
                    web.TextAtlasRender.analysisTextNodeAndFlushDrawLabel(node);
                }
                var drawCommands = node[web.property_drawLabel];
                if (drawCommands && drawCommands.length > 0) {
                    //开始画
                    var cmd = null;
                    var textBlocks = null;
                    var tb = null;
                    var page = null;
                    for (var i = 0, length_9 = drawCommands.length; i < length_9; ++i) {
                        cmd = drawCommands[i];
                        var destX = cmd.anchorX;
                        textBlocks = cmd.textBlocks;
                        for (var j = 0, length1 = textBlocks.length; j < length1; ++j) {
                            tb = textBlocks[j];
                            var destY = cmd.anchorY + 2;
                            page = tb.page;
                            buffer.context.drawTexture(page.webGLTexture, tb.u, tb.v, tb.contentWidth, tb.contentHeight, destX - tb.offsetX / canvasScaleX, destY - tb.offsetY / canvasScaleY, tb.contentWidth / canvasScaleX, tb.contentHeight / canvasScaleY, page.width, page.height);
                            destX += tb.advance / canvasScaleX;
                        }
                    }
                }
                node.dirtyRender = false;
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.renderText = function (node, buffer) {
                if (node.fontFamilyOffsetX) {
                    buffer.$offsetX += node.fontFamilyOffsetX;
                }
                if (node.fontFamilyOffsetY) {
                    buffer.$offsetY += node.fontFamilyOffsetY;
                }
                if (egret.textAtlasRenderEnable && node.size <= egret.textAtlasMaxFontSize) {
                    //新的文字渲染机制
                    this.___renderText____(node, buffer);
                    return;
                }
                var width = node.width - node.x;
                var height = node.height - node.y;
                if (width <= 0 || height <= 0 || !width || !height || node.drawData.length == 0) {
                    return;
                }
                var canvasScaleX = egret.sys.DisplayList.$canvasScaleX > 1 ? egret.sys.DisplayList.$canvasScaleX : 1 / egret.sys.DisplayList.$canvasScaleX;
                var canvasScaleY = egret.sys.DisplayList.$canvasScaleY > 1 ? egret.sys.DisplayList.$canvasScaleY : 1 / egret.sys.DisplayList.$canvasScaleY;
                var maxTextureSize = buffer.context.$maxTextureSize;
                if (width * canvasScaleX > maxTextureSize) {
                    canvasScaleX *= maxTextureSize / (width * canvasScaleX);
                }
                if (height * canvasScaleY > maxTextureSize) {
                    canvasScaleY *= maxTextureSize / (height * canvasScaleY);
                }
                width *= canvasScaleX;
                height *= canvasScaleY;
                //保证canvas宽高为2的整数倍
                var width2 = Math.round(width);
                var height2 = Math.round(height);
                if (width2 % 2 != 0) {
                    width2++;
                }
                if (height2 % 2 != 0) {
                    height2++;
                }
                canvasScaleX *= width2 / width;
                canvasScaleY *= height2 / height;
                width = width2;
                height = height2;
                var x = node.x * canvasScaleX;
                var y = node.y * canvasScaleY;
                if (node.$canvasScaleX != canvasScaleX || node.$canvasScaleY != canvasScaleY) {
                    node.$canvasScaleX = canvasScaleX;
                    node.$canvasScaleY = canvasScaleY;
                    node.dirtyRender = true;
                }
                if (this.wxiOS10) {
                    if (!this.canvasRenderer) {
                        this.canvasRenderer = new egret.CanvasRenderer();
                    }
                    if (node.dirtyRender) {
                        this.canvasRenderBuffer = new web.CanvasRenderBuffer(width, height);
                    }
                }
                else {
                    if (!this.canvasRenderBuffer || !this.canvasRenderBuffer.context) {
                        this.canvasRenderer = new egret.CanvasRenderer();
                        this.canvasRenderBuffer = new web.CanvasRenderBuffer(width, height);
                    }
                    else if (node.dirtyRender) {
                        this.canvasRenderBuffer.resize(width, height);
                    }
                }
                if (!this.canvasRenderBuffer.context) {
                    return;
                }
                // if (canvasScaleX != 1 || canvasScaleY != 1) {
                //     this.canvasRenderBuffer.context.setTransform(canvasScaleX, 0, 0, canvasScaleY, 0, 0);
                // }
                if (x || y) {
                    if (node.dirtyRender) {
                        this.canvasRenderBuffer.context.setTransform(canvasScaleX, 0, 0, canvasScaleY, -x, -y);
                    }
                    buffer.transform(1, 0, 0, 1, x / canvasScaleX, y / canvasScaleY);
                }
                else if (node.dirtyRender && (canvasScaleX != 1 || canvasScaleY != 1)) {
                    this.canvasRenderBuffer.context.scale(canvasScaleX, canvasScaleY);
                }
                if (node.dirtyRender) {
                    var surface = this.canvasRenderBuffer.surface;
                    this.canvasRenderer.renderText(node, this.canvasRenderBuffer.context);
                    //要渲染时候才更新value
                    node.updateTextValue();
                    if (surface["uriValue"] != node.textValue) {
                        surface["uriValue"] = node.textValue;
                    }
                    if (this.wxiOS10) {
                        surface["isCanvas"] = true;
                        node.$texture = surface;
                    }
                    else {
                        // 拷贝canvas到texture
                        var texture = node.$texture;
                        if (!texture) {
                            if (egret.sys.profileWebGLTexture) {
                                var c = "";
                                for (var i = 2; i < node.drawData.length; i = i + 4) {
                                    c += node.drawData[i];
                                }
                                surface["userdata"] = { "url": c };
                            }
                            texture = buffer.context.createTexture(surface, false, true, node.glFormat, node.glType);
                            node.$texture = texture;
                        }
                        else {
                            if (texture["atlasTexture"]) {
                                //textValue变了
                                if (node.dirtyTextValue) {
                                    node.cleanDirtyTextValue();
                                    node.$texture = buffer.context.createTexture(surface, true, true, node.glFormat, node.glType);
                                }
                                else {
                                    if (!web.TextureAtlasManager.updateTexture(node.textValue, surface)) {
                                        node.cleanTextAtlas();
                                        node.$texture = buffer.context.createTexture(surface, true, true, node.glFormat, node.glType);
                                    }
                                }
                            }
                            else {
                                // 重新拷贝新的图像
                                buffer.context.updateTexture(texture, surface, true, node.glFormat, node.glType);
                            }
                        }
                    }
                    // 保存材质尺寸
                    node.$textureWidth = surface.width;
                    node.$textureHeight = surface.height;
                }
                var textureWidth = node.$textureWidth;
                var textureHeight = node.$textureHeight;
                var sourceX = 0;
                var sourceY = 0;
                var sourceWidth = textureWidth;
                var sourceHeight = textureHeight;
                if (node.$texture && node.$texture["atlasTexture"] === true) {
                    //激活Atlas中对应图片
                    web.TextureAtlasManager.activeTexture(node.textValue);
                    //如果是自动合图图片，需要修改数据
                    sourceWidth = node.$texture["textureWidth"];
                    sourceHeight = node.$texture["textureHeight"];
                    // console.log(`atlas sourceX:${node.$texture["textureSourceX"]}, sourceY:${node.$texture["textureSourceY"]}`);
                    sourceX = node.$texture["textureSourceX"] + sourceX;
                    sourceY = node.$texture["textureSourceY"] + sourceY;
                }
                buffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length - 1]);
                if (this.m_objRenderLogicLastRender.enable && egret.sys.openRenderLogicLastRenderText) {
                    this.m_objRenderLogicLastRender.addRenderTextCache(buffer, node, 0, 0, textureWidth, textureHeight, 0, 0, textureWidth / canvasScaleX, textureHeight / canvasScaleY, textureWidth, textureHeight);
                }
                else {
                    buffer.context.drawTexture(node.$texture, 0, 0, textureWidth, textureHeight, 0, 0, textureWidth / canvasScaleX, textureHeight / canvasScaleY, textureWidth, textureHeight, undefined, undefined, undefined, undefined, undefined, undefined, egret.sys.textBatchIgnoreSelf ? egret.BatchType.IgnoreSelf : egret.BatchType.Batch);
                }
                if (x || y) {
                    if (node.dirtyRender) {
                        this.canvasRenderBuffer.context.translate(0, 0);
                    }
                    buffer.transform(1, 0, 0, 1, -x / canvasScaleX, -y / canvasScaleY);
                }
                node.dirtyRender = false;
            };
            /**
             * @private
             */
            WebGLRenderer.prototype.renderGraphics = function (node, buffer, forHitTest, forUpdate) {
                var width = node.width;
                var height = node.height;
                if (width <= 0 || height <= 0 || !width || !height || node.drawData.length == 0) {
                    return;
                }
                var canvasScaleX = egret.sys.DisplayList.$canvasScaleX > 1 ? egret.sys.DisplayList.$canvasScaleX : 1 / egret.sys.DisplayList.$canvasScaleX;
                var canvasScaleY = egret.sys.DisplayList.$canvasScaleY > 1 ? egret.sys.DisplayList.$canvasScaleY : 1 / egret.sys.DisplayList.$canvasScaleY;
                if (node.$scaleX || node.$scaleY) {
                    node.$scaleX && (canvasScaleX *= node.$scaleX);
                    node.$scaleY && (canvasScaleY *= node.$scaleY);
                }
                if (width * canvasScaleX < 1 || height * canvasScaleY < 1) {
                    canvasScaleX = canvasScaleY = 1;
                }
                if (node.$canvasScaleX != canvasScaleX || node.$canvasScaleY != canvasScaleY) {
                    node.$canvasScaleX = canvasScaleX;
                    node.$canvasScaleY = canvasScaleY;
                    node.dirtyRender = true;
                }
                //缩放叠加 width2 / width 填满整个区域
                width = width * canvasScaleX;
                height = height * canvasScaleY;
                //保证canvas宽高为2的整数倍
                var width2 = Math.round(width);
                var height2 = Math.round(height);
                if (width2 % 2 != 0) {
                    width2++;
                }
                if (height2 % 2 != 0) {
                    height2++;
                }
                canvasScaleX *= width2 / width;
                canvasScaleY *= height2 / height;
                width = width2;
                height = height2;
                if (this.wxiOS10) {
                    if (!this.canvasRenderer) {
                        this.canvasRenderer = new egret.CanvasRenderer();
                    }
                    if (node.dirtyRender) {
                        this.canvasRenderBuffer = new web.CanvasRenderBuffer(width, height);
                    }
                }
                else {
                    if (!this.canvasRenderBuffer || !this.canvasRenderBuffer.context) {
                        this.canvasRenderer = new egret.CanvasRenderer();
                        this.canvasRenderBuffer = new web.CanvasRenderBuffer(width, height);
                    }
                    else if (node.dirtyRender) {
                        this.canvasRenderBuffer.resize(width, height);
                    }
                }
                if (!this.canvasRenderBuffer.context) {
                    return;
                }
                if (canvasScaleX != 1 || canvasScaleY != 1) {
                    this.canvasRenderBuffer.context.setTransform(canvasScaleX, 0, 0, canvasScaleY, 0, 0);
                }
                if (node.x || node.y) {
                    if (node.dirtyRender || forHitTest) {
                        this.canvasRenderBuffer.context.translate(-node.x, -node.y);
                    }
                    buffer.transform(1, 0, 0, 1, node.x, node.y);
                }
                buffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length - 1]);
                var surface = this.canvasRenderBuffer.surface;
                if (forHitTest) {
                    this.canvasRenderer.renderGraphics(node, this.canvasRenderBuffer.context, true);
                    var texture = void 0;
                    if (this.wxiOS10) {
                        surface["isCanvas"] = true;
                        texture = surface;
                    }
                    else {
                        egret.WebGLUtils.deleteWebGLTexture(surface);
                        texture = buffer.context.getWebGLTexture(surface);
                    }
                    buffer.context.drawTexture(texture, 0, 0, width, height, 0, 0, width, height, surface.width, surface.height);
                }
                else {
                    if (node.dirtyRender) {
                        this.canvasRenderer.renderGraphics(node, this.canvasRenderBuffer.context);
                        if (this.wxiOS10) {
                            surface["isCanvas"] = true;
                            node.$texture = surface;
                        }
                        else {
                            // 拷贝canvas到texture
                            var texture = node.$texture;
                            if (!texture) {
                                if (egret.sys.profileWebGLTexture) {
                                    surface["userdata"] = { "url": "graphics texture" };
                                }
                                texture = buffer.context.createTexture(surface, false, true, node.glFormat, node.glType);
                                node.$texture = texture;
                            }
                            else {
                                // 重新拷贝新的图像
                                buffer.context.updateTexture(texture, surface, true, node.glFormat, node.glType);
                            }
                        }
                        // 保存材质尺寸
                        node.$textureWidth = surface.width;
                        node.$textureHeight = surface.height;
                    }
                    if (!forUpdate) {
                        var textureWidth = node.$textureWidth;
                        var textureHeight = node.$textureHeight;
                        buffer.context.drawTexture(node.$texture, 0, 0, textureWidth, textureHeight, 0, 0, textureWidth / canvasScaleX, textureHeight / canvasScaleY, textureWidth, textureHeight);
                    }
                }
                if (node.x || node.y) {
                    if (node.dirtyRender || forHitTest) {
                        this.canvasRenderBuffer.context.translate(node.x, node.y);
                    }
                    buffer.transform(1, 0, 0, 1, -node.x, -node.y);
                }
                if (!forHitTest) {
                    node.dirtyRender = false;
                }
                buffer.$renderCanvas++;
            };
            WebGLRenderer.prototype.renderGroup = function (groupNode, buffer) {
                var m = groupNode.matrix;
                var savedMatrix;
                var offsetX;
                var offsetY;
                if (m) {
                    savedMatrix = egret.Matrix.create();
                    var curMatrix = buffer.globalMatrix;
                    savedMatrix.a = curMatrix.a;
                    savedMatrix.b = curMatrix.b;
                    savedMatrix.c = curMatrix.c;
                    savedMatrix.d = curMatrix.d;
                    savedMatrix.tx = curMatrix.tx;
                    savedMatrix.ty = curMatrix.ty;
                    offsetX = buffer.$offsetX;
                    offsetY = buffer.$offsetY;
                    buffer.useOffset();
                    buffer.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
                }
                var children = groupNode.drawData;
                var length = children.length;
                for (var i = 0; i < length; i++) {
                    var node = children[i];
                    this.renderNode(node, buffer, buffer.$offsetX, buffer.$offsetY);
                }
                if (m) {
                    var matrix = buffer.globalMatrix;
                    matrix.a = savedMatrix.a;
                    matrix.b = savedMatrix.b;
                    matrix.c = savedMatrix.c;
                    matrix.d = savedMatrix.d;
                    matrix.tx = savedMatrix.tx;
                    matrix.ty = savedMatrix.ty;
                    buffer.$offsetX = offsetX;
                    buffer.$offsetY = offsetY;
                    egret.Matrix.release(savedMatrix);
                }
            };
            WebGLRenderer.prototype.renderSdfGraphics = function (node, buffer) {
                // 目前先只支持Rect
                buffer.context.setGlobalCompositeOperation(defaultCompositeOpStack[defaultCompositeOpStack.length - 1]);
                buffer.context.drawSdfRect(node.x, node.y, node.width, node.height, node.color, node.alpha);
            };
            /**
             * @private
             */
            // private createRenderBuffer(width: number, height: number): WebGLRenderBuffer {
            //     let buffer = renderBufferPool.pop();
            //     if (buffer) {
            //         buffer.resize(width, height);
            //         buffer.setTransform(1, 0, 0, 1, 0, 0);
            //     }
            //     else {
            //         buffer = new WebGLRenderBuffer(width, height);
            //         buffer.$computeDrawCall = false;
            //     }
            //     return buffer;
            // }
            WebGLRenderer.prototype.renderClear = function () {
                var renderContext = web.WebGLRenderContext.getInstance();
                var gl = renderContext.context;
                renderContext.$beforeRender();
                var width = renderContext.surface.width;
                var height = renderContext.surface.height;
                gl.viewport(0, 0, width, height);
            };
            WebGLRenderer.prototype.addBuiltInShader = function (vertSource, fragSource, key) {
                var renderContext = web.WebGLRenderContext.getInstance();
                var gl = renderContext.context;
                web.EgretWebGLProgram.setProgram(gl, vertSource, fragSource, key);
            };
            return WebGLRenderer;
        }());
        web.WebGLRenderer = WebGLRenderer;
        __reflect(WebGLRenderer.prototype, "egret.web.WebGLRenderer", ["egret.sys.SystemRenderer"]);
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));

(function (egret) {
    var web;
    (function (web) {
        /**渲染逻辑分层指令管理器 */
        var WebGLRenderLogicHierarchy = /** @class */ (function () {
            function WebGLRenderLogicHierarchy() {
                this.m_bEnable = false;
            }
            Object.defineProperty(WebGLRenderLogicHierarchy.prototype, "enable", {
                get: function () {
                    return this.m_bEnable;
                },
                set: function (val) {
                    this.m_bEnable = val;
                },
                enumerable: true,
                configurable: true
            });
            WebGLRenderLogicHierarchy.prototype.start = function () {
                if (!egret.sys.openRenderLogicHierarchy) {
                    return;
                }
                this.enable = true;
                this.clear();
            };
            WebGLRenderLogicHierarchy.prototype.end = function () {
                this.enable = false;
                this.clear();
            };
            WebGLRenderLogicHierarchy.prototype.clear = function () {
                this.m_dictDrawTextureCmdPos = {};
            };
            WebGLRenderLogicHierarchy.prototype.drawImage = function (buffer, // is  WebGLRenderBuffer
            image, node, depthMasks) {
                var hierarchy = node.nRenderLogicHierarchy;
                var bNeedBatch = (buffer.context).drawImage(image, node.sourceX, node.sourceY, node.sourceW, node.sourceH, node.drawX, node.drawY, node.drawW, node.drawH, node.imageWidth, node.imageHeight, node.rotated, node.smoothing, depthMasks, hierarchy);
                if (!bNeedBatch) {
                    return;
                }
                // if (egret.sys.openBatchTextureCmd) {
                //     // 不处理，暂时没有做兼容处理 // fiexed
                //     return;
                // }
                if (!hierarchy) {
                    return;
                }
                // 合批到目标cmd
                var drawCmdManager = buffer.context.drawCmdManager;
                var vao = buffer.context['vao'];
                var vaoQuadVertexSize = vao.quadVertexSize;
                var curCmdIdx = drawCmdManager.drawDataLen - 1;
                var info = this.m_dictDrawTextureCmdPos[hierarchy];
                if (!info) { // 记录首次出现pos
                    var curCmd = drawCmdManager.drawData[curCmdIdx];
                    if (curCmd) {
                        var curVaoVertexIdx = vao.getVertexDataSize() - curCmd.count / 2 * vaoQuadVertexSize;
                        this.m_dictDrawTextureCmdPos[hierarchy] = { cmdIdx: curCmdIdx, vaoVertexIdx: curVaoVertexIdx };
                    }
                }
                else { // 有合并目标cmd
                    var cmdIdx = info.cmdIdx;
                    var vaoVertexIdx = info.vaoVertexIdx;
                    var targetCmd = drawCmdManager.drawData[cmdIdx];
                    var success = false;
                    if (targetCmd) {
                        success = vao.batchArrays(vaoVertexIdx + vaoQuadVertexSize * targetCmd.count / 2);
                    }
                    if (success) {
                        drawCmdManager.batchDrawTexture(cmdIdx);
                    }
                }
            };
            return WebGLRenderLogicHierarchy;
        }());
        web.WebGLRenderLogicHierarchy = WebGLRenderLogicHierarchy;
        __reflect(WebGLRenderLogicHierarchy.prototype, "egret.web.WebGLRenderLogicHierarchy");
        /**渲染逻辑后处理指令管理器 */
        var WebGLRenderLogicLastRender = /** @class */ (function () {
            function WebGLRenderLogicLastRender() {
                this.m_bEnable = false;
            }
            Object.defineProperty(WebGLRenderLogicLastRender.prototype, "enable", {
                get: function () {
                    return this.m_bEnable;
                },
                set: function (val) {
                    this.m_bEnable = val;
                },
                enumerable: true,
                configurable: true
            });
            WebGLRenderLogicLastRender.prototype.start = function () {
                if (!egret.sys.openRenderLogicLastRender) {
                    return;
                }
                this.enable = true;
                this.clear();
            };
            WebGLRenderLogicLastRender.prototype.end = function () {
                this.enable = false;
                this.drawRenderImageCache();
                this.drawRenderTextCache();
                this.clear();
            };
            WebGLRenderLogicLastRender.prototype.clear = function () {
                this.m_dictRenderImageCache = {};
                this.m_listRenderTextCache = [];
            };
            // ====== cache
            /**目前只支持图片 */
            WebGLRenderLogicLastRender.prototype.addRenderImageCache = function (buffer, // is  WebGLRenderBuffer
            image, node, depthMasks) {
                var hierarchy = node.nRenderLogicHierarchy || 999;
                var arrRenderData = this.m_dictRenderImageCache[hierarchy];
                if (!arrRenderData) {
                    arrRenderData = [];
                    this.m_dictRenderImageCache[hierarchy] = arrRenderData;
                }
                var renderData = {
                    buffer: buffer,
                    globalTiniColor: buffer.globalTintColor,
                    globalAlpha: buffer.globalAlpha,
                    globalMatrix: buffer.globalMatrix.clone(),
                    offsetX: buffer.$offsetX,
                    offsetY: buffer.$offsetY,
                    image: image,
                    sourceX: node.sourceX, sourceY: node.sourceY, sourceWidth: node.sourceW, sourceHeight: node.sourceH,
                    destX: node.drawX, destY: node.drawY, destWidth: node.drawW, destHeight: node.drawH,
                    textureWidth: node.imageWidth, textureHeight: node.imageHeight,
                    rotated: node.rotate, smoothing: node.smoothing, depthMasks: depthMasks,
                    // hierarchy: node.nRenderLogicHierarchy,
                    hierarchy: undefined // /**无效掉renderData.hierarchy，从而可以促使引擎自带的自动合批。mind:如果使用的话，就可以调用WebGLRenderLogicHierarchy来使用 */
                };
                arrRenderData.push(renderData);
            };
            WebGLRenderLogicLastRender.prototype.addRenderTextCache = function (buffer, node, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, textureWidth, textureHeight) {
                var oneCache = {
                    buffer: buffer,
                    globalTiniColor: buffer.globalTintColor,
                    globalAlpha: buffer.globalAlpha,
                    globalMatrix: buffer.globalMatrix.clone(),
                    offsetX: buffer.$offsetX,
                    offsetY: buffer.$offsetY,
                    texture: node.$texture,
                    sourceX: sourceX, sourceY: sourceY, sourceWidth: sourceWidth, sourceHeight: sourceHeight,
                    destX: destX, destY: destY, destWidth: destWidth, destHeight: destHeight,
                    textureWidth: textureWidth,
                    textureHeight: textureHeight,
                    hierarchy: undefined
                };
                this.m_listRenderTextCache.push(oneCache);
            };
            // ====== draw
            WebGLRenderLogicLastRender.prototype.drawRenderImageCache = function () {
                for (var key in this.m_dictRenderImageCache) {
                    var arrRenderData = this.m_dictRenderImageCache[key];
                    for (var _i = 0, arrRenderData_1 = arrRenderData; _i < arrRenderData_1.length; _i++) {
                        var renderData = arrRenderData_1[_i];
                        if (renderData) {
                            var buffer = renderData.buffer;
                            var context = buffer.context;
                            context.drawImageLastRender(renderData);
                        }
                    }
                }
            };
            WebGLRenderLogicLastRender.prototype.drawRenderTextCache = function () {
                for (var _i = 0, _a = this.m_listRenderTextCache; _i < _a.length; _i++) {
                    var renderData = _a[_i];
                    var buffer = renderData.buffer;
                    var context = buffer.context;
                    context.drawTextLastRender(renderData);
                }
            };
            return WebGLRenderLogicLastRender;
        }());
        web.WebGLRenderLogicLastRender = WebGLRenderLogicLastRender;
        __reflect(WebGLRenderLogicLastRender.prototype, "egret.web.WebGLRenderLogicLastRender");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////
/*
*** 一个管理模型，逐级包含: book -> page -> line -> textBlock
*/

(function (egret) {
    var web;
    (function (web) {
        //Char在Atlas中的信息
        var TextBlock = /** @class */ (function (_super) {
            __extends(TextBlock, _super);
            function TextBlock(key, width, height, offsetX, offsetY, measureWidth, measureHeight, advance) {
                var _this = _super.call(this) || this;
                _this.charWithStyleHashCode = 0;
                _this._width = 0;
                _this._height = 0;
                _this._referenceCount = 0;
                _this.page = null;
                _this.index = 0;
                _this.x = 0;
                _this.y = 0;
                _this.u = 0;
                _this.v = 0;
                _this.tag = '';
                _this.offsetX = 0;
                _this.offsetY = 0;
                _this.measureWidth = 0;
                _this.measureHeight = 0;
                _this.advance = 0;
                _this.charWithStyleHashCode = key;
                _this._width = width;
                _this._height = height;
                _this.offsetX = offsetX;
                _this.offsetY = offsetY;
                _this.measureWidth = measureWidth;
                _this.measureHeight = measureHeight;
                _this.advance = advance;
                return _this;
            }
            Object.defineProperty(TextBlock.prototype, "key", {
                get: function () {
                    return this.charWithStyleHashCode;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TextBlock.prototype, "referenceCount", {
                get: function () {
                    return this._referenceCount;
                },
                enumerable: true,
                configurable: true
            });
            TextBlock.prototype.retain = function () {
                this._referenceCount++;
            };
            TextBlock.prototype.release = function () {
                this._referenceCount--;
            };
            Object.defineProperty(TextBlock.prototype, "width", {
                get: function () {
                    return this._width;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TextBlock.prototype, "height", {
                get: function () {
                    return this._height;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TextBlock.prototype, "contentWidth", {
                get: function () {
                    return this.measureWidth;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TextBlock.prototype, "contentHeight", {
                get: function () {
                    return this.measureHeight;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TextBlock.prototype, "subImageOffsetX", {
                get: function () {
                    return this.x;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TextBlock.prototype, "subImageOffsetY", {
                get: function () {
                    return this.y;
                },
                enumerable: true,
                configurable: true
            });
            TextBlock.prototype.updateUV = function () {
                this.u = this.x + web.atlas_padding;
                this.v = this.y + web.atlas_padding;
            };
            return TextBlock;
        }(egret.HashObject));
        web.TextBlock = TextBlock;
        __reflect(TextBlock.prototype, "egret.web.TextBlock");
        //存储Height相同的TextBlock
        var TextLine = /** @class */ (function (_super) {
            __extends(TextLine, _super);
            function TextLine(y, width, height, gap) {
                var _this = _super.call(this) || this;
                _this.currentX = 0;
                _this.y = y;
                _this.width = width;
                _this.height = height;
                _this.gap = gap;
                return _this;
            }
            TextLine.prototype.addTextBlock = function (textBlock) {
                if (this.currentX + textBlock.measureWidth > this.width)
                    return false;
                textBlock.x = this.currentX;
                textBlock.y = this.y;
                this.currentX += textBlock.measureWidth + this.gap;
                return true;
            };
            return TextLine;
        }(egret.HashObject));
        __reflect(TextLine.prototype, "TextLine");
        //将texture划分大小固定的block存储char
        var Page = /** @class */ (function (_super) {
            __extends(Page, _super);
            function Page(width, height, gap) {
                var _this = _super.call(this) || this;
                _this.currentY = 0;
                _this.webGLTexture = null;
                _this.avaliableLines = {};
                _this.lines = [];
                _this.textBlockMap = {}; //缓存Page管理的Block
                _this.width = width;
                _this.height = height;
                _this.gap = gap;
                return _this;
            }
            Page.prototype.findBlock = function (key) {
                var bolck = this.textBlockMap[key];
                if (!bolck)
                    return null;
                return bolck;
            };
            Page.prototype.addTextBlock = function (textBlock) {
                var line = this.avaliableLines[textBlock.height];
                if (line && line.addTextBlock(textBlock)) {
                    this.textBlockMap[textBlock.key] = textBlock;
                    textBlock.page = this;
                    return true;
                }
                //Page满了
                if (this.currentY + textBlock.height > this.height)
                    return false;
                line = new TextLine(this.currentY, this.width, textBlock.height, this.gap);
                this.avaliableLines[textBlock.height] = line;
                this.lines.push(line);
                this.currentY += textBlock.height + this.gap;
                //textBlock width大于行宽，应该不大可能
                if (!line.addTextBlock(textBlock))
                    return false;
                this.textBlockMap[textBlock.key] = textBlock;
                textBlock.page = this;
                return true;
            };
            Page.prototype.dispose = function () {
                if (this.webGLTexture) {
                    egret.WebGLUtils.deleteWebGLTexture(this.webGLTexture);
                    this.webGLTexture = null;
                }
            };
            //用于查看每个字号的使用程度，手动调整block slot size
            Page.prototype.printPageUsage = function () {
                var dict = {};
                for (var _i = 0, _a = this.lines; _i < _a.length; _i++) {
                    var line = _a[_i];
                    dict[line.height] = !!dict[line.height] ? dict[line.height] + line.currentX : line.currentX;
                }
                console.log(dict);
            };
            return Page;
        }(egret.HashObject));
        web.Page = Page;
        __reflect(Page.prototype, "egret.web.Page");
        var Book = /** @class */ (function (_super) {
            __extends(Book, _super);
            function Book(width, height, gap) {
                if (width === void 0) { width = 1024; }
                if (height === void 0) { height = 1024; }
                if (gap === void 0) { gap = 1; }
                var _this = _super.call(this) || this;
                _this.page = null;
                _this.secondaryPage = null;
                _this.gap = 1;
                _this.width = width;
                _this.height = height;
                _this.gap = gap;
                _this.page = new Page(_this.width, _this.height, _this.gap);
                egret.textAtlasMainPage = _this.page;
                return _this;
            }
            Book.prototype.findBlock = function (key) {
                return this.page.findBlock(key);
            };
            Book.prototype.addTextBlock = function (textBlock) {
                if (!textBlock)
                    return false;
                if (!this.page.addTextBlock(textBlock)) {
                    if (this.secondaryPage) {
                        console.log("More than one secondaryPage create!");
                        return false;
                    }
                    this.secondaryPage = this.page;
                    this.page = new Page(this.width, this.height, this.gap);
                    //如果新建的page也无法分配block，肯定是出什么bug了，回退分配的page
                    if (!this.page.addTextBlock(textBlock)) {
                        this.page = this.secondaryPage;
                        return false;
                    }
                    egret.textAtlasMainPage = this.page;
                    egret.ticker.addEventListener("beforeRender", this.removeSecondaryPageBeforeRender, this);
                }
                //更新下uv
                textBlock.updateUV();
                return true;
            };
            Book.prototype.createTextBlock = function (tag, key, width, height, offsetX, offsetY, measureWidth, measureHeight, advance) {
                var txtBlock = new TextBlock(key, width, height, offsetX, offsetY, measureWidth, measureHeight, advance);
                if (!this.addTextBlock(txtBlock)) {
                    //走到这里几乎是不可能的，除非内存分配没了
                    //暂时还没有到提交纹理的地步，现在都是虚拟的
                    return null;
                }
                txtBlock.tag = tag;
                return txtBlock;
            };
            //渲染前清理secondaryPage
            Book.prototype.removeSecondaryPageBeforeRender = function () {
                if (this.secondaryPage) {
                    this.secondaryPage.dispose();
                    this.secondaryPage = null;
                    egret.ticker.removeEventListener("beforeRender", this.removeSecondaryPageBeforeRender, this);
                }
            };
            return Book;
        }(egret.HashObject));
        web.Book = Book;
        __reflect(Book.prototype, "egret.web.Book");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        //测试开关,打开会截住老的字体渲染
        web.textAtlasRenderEnable = false;
        egret.textAtlasRenderEnable = web.textAtlasRenderEnable;
        //测试对象, 先不用singleton的，后续整理代码，就new一个，放在全局的context上做成员变量
        web.__textAtlasRender__ = null;
        //不想改TextNode的代码了，先用这种方式实现，以后稳了再改
        web.property_drawLabel = 'DrawLabel';
        //图集padding
        web.atlas_padding = 0;
        //开启这个，用textAtlas渲染出来的，都是红字，而且加黑框
        var textAtlasDebug = false;
        //画一行
        var DrawLabel = /** @class */ (function (_super) {
            __extends(DrawLabel, _super);
            function DrawLabel() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                //记录初始位置
                _this.anchorX = 0;
                _this.anchorY = 0;
                //要画的字块
                _this.textBlocks = [];
                return _this;
            }
            //清除数据，回池
            DrawLabel.prototype.clear = function () {
                this.release();
                this.anchorX = 0;
                this.anchorY = 0;
                this.textBlocks.length = 0; //这个没事,实体在book里面存着
            };
            DrawLabel.prototype.release = function () {
                for (var _i = 0, _a = this.textBlocks; _i < _a.length; _i++) {
                    var block = _a[_i];
                    block.release();
                    //不删除block
                    //if (block.referenceCount == 0) {
                    //    __textAtlasRender__.removeTextBlock(block.charWithStyleHashCode);
                    //}
                }
            };
            //池子创建
            DrawLabel.create = function () {
                var pool = DrawLabel.pool;
                if (pool.length === 0) {
                    pool.push(new DrawLabel);
                }
                return pool.pop();
            };
            //回池
            DrawLabel.back = function (drawLabel, checkRepeat) {
                if (!drawLabel) {
                    return;
                }
                var pool = DrawLabel.pool;
                if (checkRepeat && pool.indexOf(drawLabel) >= 0) {
                    console.error('DrawLabel.back repeat');
                    return;
                }
                drawLabel.clear();
                pool.push(drawLabel);
            };
            //池子，防止反复创建
            DrawLabel.pool = [];
            return DrawLabel;
        }(egret.HashObject));
        web.DrawLabel = DrawLabel;
        __reflect(DrawLabel.prototype, "egret.web.DrawLabel");
        //记录样式的
        var StyleInfo = /** @class */ (function (_super) {
            __extends(StyleInfo, _super);
            //
            function StyleInfo(textNode, format, canvasScaleX, canvasScaleY) {
                var _this = _super.call(this) || this;
                _this.format = null;
                //debug强制红色
                var saveTextColorForDebug = 0;
                if (textAtlasDebug) {
                    saveTextColorForDebug = textNode.textColor;
                    textNode.textColor = 0xff0000;
                }
                //存上
                _this.textColor = textNode.textColor;
                _this.strokeColor = textNode.strokeColor;
                _this.size = textNode.size;
                _this.stroke = textNode.stroke;
                _this.bold = textNode.bold;
                _this.italic = textNode.italic;
                _this.fontFamily = textNode.fontFamily;
                _this.shadow = textNode.shadow;
                _this.shadowColor = textNode.shadowColor;
                _this.shadowOffsetX = textNode.shadowOffsetX;
                _this.shadowOffsetY = textNode.shadowOffsetY;
                _this.shadowBlur = textNode.shadowBlur;
                _this.format = format;
                _this.font = egret.getFontString(textNode, _this.format);
                //描述用于生成hashcode
                var textColor = (!format.textColor ? textNode.textColor : format.textColor);
                var strokeColor = (!format.strokeColor ? textNode.strokeColor : format.strokeColor);
                var stroke = (!format.stroke ? textNode.stroke : format.stroke);
                var size = (!format.size ? textNode.size : format.size);
                //
                _this.description = '' + _this.font + '-' + size;
                _this.description += '-' + egret.toColorString(textColor);
                _this.description += '-' + egret.toColorString(strokeColor);
                if (_this.bold) {
                    _this.description += '-bold';
                }
                if (_this.italic) {
                    _this.description += '-italic';
                }
                if (_this.shadow) {
                    _this.description += '-shadow';
                }
                if (stroke) {
                    _this.description += '-' + stroke * 2;
                }
                _this.description += '-' + canvasScaleX + 'x' + canvasScaleY;
                //还原
                if (textAtlasDebug) {
                    textNode.textColor = saveTextColorForDebug;
                }
                return _this;
            }
            return StyleInfo;
        }(egret.HashObject));
        __reflect(StyleInfo.prototype, "StyleInfo");
        //测量字体和绘制的
        var CharImageRender = /** @class */ (function (_super) {
            __extends(CharImageRender, _super);
            function CharImageRender() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                //要渲染的字符串
                _this.char = '';
                //StyleInfo
                _this.styleInfo = null;
                //生成hashcode的字符串
                _this.hashCodeString = '';
                //字母：style设置行程唯一值
                _this.charWithStyleHashCode = 0;
                _this.measureWidth = 0;
                _this.measureHeight = 0;
                _this.offsetX = 0;
                _this.offsetY = 0;
                _this.advance = 0;
                _this.canvasScaleX = 1;
                _this.canvasScaleY = 1;
                return _this;
            }
            CharImageRender.prototype.reset = function (char, styleKey, canvasScaleX, canvasScaleY) {
                this.char = char;
                this.styleInfo = styleKey;
                this.hashCodeString = char + ':' + styleKey.description;
                this.charWithStyleHashCode = egret.NumberUtils.convertStringToHashCode(this.hashCodeString);
                this.canvasScaleX = canvasScaleX;
                this.canvasScaleY = canvasScaleY;
                return this;
            };
            CharImageRender.prototype.measureAndDraw = function (targetCanvas) {
                var canvas = targetCanvas;
                if (!canvas) {
                    return;
                }
                //读取设置
                var text = this.char;
                var format = this.styleInfo.format;
                var textColor = (!format.textColor ? this.styleInfo.textColor : format.textColor);
                var strokeColor = (!format.strokeColor ? this.styleInfo.strokeColor : format.strokeColor);
                var stroke = (!format.stroke ? this.styleInfo.stroke : format.stroke);
                var size = (!format.size ? this.styleInfo.size : format.size);
                var shadow = (!format.shadow ? this.styleInfo.shadow : format.shadow);
                var shadowBlur = (!format.shadowBlur ? this.styleInfo.shadowBlur : format.shadowBlur);
                var shadowOffsetX = (!format.shadowOffsetX ? this.styleInfo.shadowOffsetX : format.shadowOffsetX);
                var shadowOffsetY = (!format.shadowOffsetY ? this.styleInfo.shadowOffsetY : format.shadowOffsetY);
                //开始测量---------------------------------------
                this.textMetrics = egret.sys.measureAtlasText(text, this.styleInfo.fontFamily, size || this.styleInfo.size, this.styleInfo.bold, this.styleInfo.italic);
                //这里做ceil主要是为了对齐，避免半像素问题
                var ceilAscent = Math.ceil(this.textMetrics.actualBoundingBoxAscent);
                var ceilLeft = Math.ceil(this.textMetrics.actualBoundingBoxLeft);
                //这里对measureHeight做ceil是发现有半像素渲染不全的问题
                this.measureWidth = Math.ceil(ceilLeft + this.textMetrics.actualBoundingBoxRight);
                this.measureHeight = Math.ceil(ceilAscent + this.textMetrics.actualBoundingBoxDescent);
                var localOffsetX = this.textMetrics.actualBoundingBoxLeft - ceilLeft;
                //这里是为了兼任旧版本的浏览器不支持actualBoundingBoxAscent等属性导致的显示问题
                if (!this.measureWidth || !this.measureHeight) {
                    if (egret.Capabilities.os === "Android" || egret.Capabilities.runtimeType === "qqgame") {
                        ceilAscent = size + 4;
                        ceilLeft = 1;
                        localOffsetX = 0;
                        this.measureWidth = size + 2;
                        this.measureHeight = size + 4;
                    }
                    else {
                        ceilAscent = size + 2;
                        ceilLeft = 1;
                        localOffsetX = 0;
                        this.measureWidth = size + 2;
                        this.measureHeight = size + 2;
                    }
                }
                this.advance = this.textMetrics.width;
                //处理x方向上的偏移
                this.offsetX = ceilLeft;
                //统一根据stroke或者shadow的设置增加Block Size
                var strokeAndShadowSize2 = stroke * 2;
                //粗体宽高增加2像素
                if (this.styleInfo.bold) {
                    strokeAndShadowSize2 = Math.max(2, strokeAndShadowSize2);
                }
                if (shadow) {
                    var shadowAddSize = (shadowBlur + Math.max(Math.abs(shadowOffsetX), Math.abs(shadowOffsetY))) * 2;
                    strokeAndShadowSize2 = strokeAndShadowSize2 < shadowAddSize ? shadowAddSize : strokeAndShadowSize2;
                }
                if (strokeAndShadowSize2 > 0) {
                    this.measureWidth += strokeAndShadowSize2;
                    this.measureHeight += strokeAndShadowSize2;
                    this.offsetX += strokeAndShadowSize2 / 2;
                }
                //y方向上原来默认以y = size处作为base line，在atlas中需要配合ascent做出偏移，避免渲染不全的问题
                this.offsetY = strokeAndShadowSize2 / 2;
                this.offsetY += ceilAscent - size;
                //计算字体大小
                var canvasWidth = this.measureWidth;
                var canvasHeight = this.measureHeight;
                //为了更好的分配字体在Atlas的占用，经验数值，暂时先这么写
                for (var _i = 0, _a = [18, 20, 22, 24, 26, 28, 32, 44]; _i < _a.length; _i++) {
                    var fixedSize = _a[_i];
                    if (canvasHeight <= fixedSize) {
                        canvasHeight = fixedSize;
                        break;
                    }
                }
                //赋值
                canvasWidth = Math.ceil((canvasWidth + web.atlas_padding * 2) * this.canvasScaleX);
                canvasHeight = Math.ceil((canvasHeight + web.atlas_padding * 2) * this.canvasScaleY);
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                this.measureWidth *= this.canvasScaleX;
                this.measureHeight *= this.canvasScaleY;
                //再开始绘制---------------------------------------
                var context = egret.sys.getContext2d(canvas);
                context.save();
                context.scale(this.canvasScaleX, this.canvasScaleY);
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.textAlign = 'left';
                context.textBaseline = 'bottom';
                context.lineJoin = 'round';
                context.font = this.styleInfo.font;
                // context.fillStyle = "black";
                // context.fillRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = egret.toColorString(textColor);
                context.strokeStyle = egret.toColorString(strokeColor);
                if (stroke) {
                    context.lineWidth = stroke * 2;
                    context.strokeText(text, (web.atlas_padding + this.offsetX + localOffsetX) * this.canvasScaleX, (web.atlas_padding + size + this.offsetY) * this.canvasScaleY + egret.textAtlasRendererOffsetY);
                }
                if (shadow) {
                    var shadowColor = (!format.shadowColor ? this.styleInfo.shadowColor : format.shadowColor);
                    context.shadowColor = egret.toColorString(shadowColor);
                    context.shadowOffsetX = shadowOffsetX;
                    context.shadowOffsetY = shadowOffsetY;
                    context.shadowBlur = shadowBlur;
                }
                context.fillText(text, (web.atlas_padding + this.offsetX + localOffsetX) * this.canvasScaleX, (web.atlas_padding + size + this.offsetY) * this.canvasScaleY + egret.textAtlasRendererOffsetY);
                if (shadow) {
                    context.shadowOffsetX = 0;
                    context.shadowOffsetY = 0;
                    context.shadowBlur = 0;
                }
                context.restore();
            };
            return CharImageRender;
        }(egret.HashObject));
        __reflect(CharImageRender.prototype, "CharImageRender");
        //对外的类
        var TextAtlasRender = /** @class */ (function (_super) {
            __extends(TextAtlasRender, _super);
            //
            function TextAtlasRender(webglRenderContext) {
                var _this = _super.call(this) || this;
                _this.book = null;
                _this.charImageRender = new CharImageRender;
                _this._canvas = null;
                _this.textAtlasTextureCache = [];
                _this.webglRenderContext = null;
                _this.webglRenderContext = webglRenderContext;
                _this.book = new web.Book();
                return _this;
            }
            //分析textNode，把数据提取出来，然后给textNode挂上渲染的信息
            TextAtlasRender.analysisTextNodeAndFlushDrawLabel = function (textNode) {
                if (!textNode) {
                    return;
                }
                if (!web.__textAtlasRender__) {
                    //创建，后续会转移给WebGLRenderContext
                    var webglcontext = egret.web.WebGLRenderContext.getInstance(0, 0);
                    web.__textAtlasRender__ = new TextAtlasRender(webglcontext);
                    egret.textAtlasRenderer = web.__textAtlasRender__;
                }
                //清除命令
                textNode[web.property_drawLabel] = textNode[web.property_drawLabel] || [];
                var drawLabels = textNode[web.property_drawLabel];
                for (var _i = 0, drawLabels_1 = drawLabels; _i < drawLabels_1.length; _i++) {
                    var drawLabel = drawLabels_1[_i];
                    //还回去
                    DrawLabel.back(drawLabel, false);
                }
                drawLabels.length = 0;
                //重新装填
                var drawData = textNode.drawData;
                var anchorX = 0;
                var anchorY = 0;
                var labelString = '';
                var labelFormat = {};
                var resultAsRenderTextBlocks = [];
                for (var i = 0, length_10 = drawData.length; i < length_10; i += 4) {
                    anchorX = drawData[i + 0];
                    anchorY = drawData[i + 1];
                    labelString = drawData[i + 2];
                    labelFormat = drawData[i + 3] || {};
                    resultAsRenderTextBlocks.length = 0;
                    //提取数据
                    web.__textAtlasRender__.convertLabelStringToTextAtlas(labelString, new StyleInfo(textNode, labelFormat, textNode.$canvasScaleX, textNode.$canvasScaleY), resultAsRenderTextBlocks, textNode.$canvasScaleX, textNode.$canvasScaleY);
                    //pool创建 + 添加命令
                    var drawLabel = DrawLabel.create();
                    drawLabel.anchorX = anchorX;
                    drawLabel.anchorY = anchorY;
                    drawLabel.textBlocks = [].concat(resultAsRenderTextBlocks);
                    drawLabels.push(drawLabel);
                }
            };
            //字符串转化成为TextBlock
            TextAtlasRender.prototype.convertLabelStringToTextAtlas = function (labelstring, styleKey, resultAsRenderTextBlocks, canvasScaleX, canvasScaleY) {
                var canvas = this.canvas;
                var charImageRender = this.charImageRender;
                for (var _i = 0, labelstring_1 = labelstring; _i < labelstring_1.length; _i++) {
                    var char = labelstring_1[_i];
                    //检查char是否已经在Atlas中
                    charImageRender.reset(char, styleKey, canvasScaleX, canvasScaleY);
                    var txtBlock = this.book.findBlock(charImageRender.charWithStyleHashCode);
                    if (txtBlock) {
                        resultAsRenderTextBlocks.push(txtBlock);
                        continue;
                    }
                    //绘制单个char到canvas
                    charImageRender.measureAndDraw(canvas);
                    if (canvas.height > 44) {
                        console.warn("字体大小超出预期，请检查字体设置", labelstring);
                        // return
                    }
                    //创建新的txtBlock
                    txtBlock = this.book.createTextBlock(char, charImageRender.charWithStyleHashCode, canvas.width, canvas.height, charImageRender.offsetX, charImageRender.offsetY, charImageRender.measureWidth, charImageRender.measureHeight, charImageRender.advance);
                    if (!txtBlock) {
                        continue;
                    }
                    //需要绘制记录在resultAsRenderTextBlocks中
                    txtBlock.retain();
                    resultAsRenderTextBlocks.push(txtBlock);
                    // 空格不需要画，防止webgl warning
                    if (char.trim() === "") {
                        continue;
                    }
                    //生成纹理
                    var page = txtBlock.page;
                    if (!page.webGLTexture) {
                        page.webGLTexture = this.createTextTextureAtlas(page.width, page.height, textAtlasDebug);
                    }
                    var gl = this.webglRenderContext.context;
                    page.webGLTexture[egret.glContext] = gl;
                    gl.bindTexture(gl.TEXTURE_2D, page.webGLTexture);
                    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
                    page.webGLTexture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL] = true;
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, txtBlock.subImageOffsetX, txtBlock.subImageOffsetY, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
                    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
                }
            };
            //给一个page创建一个纹理
            TextAtlasRender.prototype.createTextTextureAtlas = function (width, height, debug) {
                var texture = null;
                if (debug) {
                    //做一个黑底子的，方便调试代码
                    var canvas = egret.sys.createCanvas(width, width);
                    var context = egret.sys.getContext2d(canvas);
                    context.fillStyle = 'black';
                    context.fillRect(0, 0, width, width);
                    texture = egret.sys.createTexture(this.webglRenderContext, canvas);
                }
                else {
                    //真的
                    texture = egret.sys._createTexture(this.webglRenderContext, width, height, null);
                }
                if (texture) {
                    //存起来，未来可以删除，或者查看
                    this.textAtlasTextureCache.push(texture);
                }
                return texture;
            };
            Object.defineProperty(TextAtlasRender.prototype, "canvas", {
                //给CharImageRender用的canvas
                get: function () {
                    if (!this._canvas) {
                        //就用默认体积24
                        this._canvas = egret.sys.createCanvas(24, 24);
                    }
                    return this._canvas;
                },
                enumerable: true,
                configurable: true
            });
            return TextAtlasRender;
        }(egret.HashObject));
        web.TextAtlasRender = TextAtlasRender;
        __reflect(TextAtlasRender.prototype, "egret.web.TextAtlasRender");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        var PackerRect = /** @class */ (function () {
            function PackerRect() {
                /**
                 * 起点 x 坐标
                 */
                this.x = 0;
                /**
                 * 起点 y 坐标
                 */
                this.y = 0;
                /**
                 * 宽度
                 */
                this.width = 0;
                /**
                 * 高度
                 */
                this.height = 0;
                /**
                 * 当前是否被旋转了
                 */
                this.isRotated = false;
            }
            /**
             * 克隆
             */
            PackerRect.prototype.clone = function () {
                var cloned = new PackerRect();
                cloned.x = this.x;
                cloned.y = this.y;
                cloned.height = this.height;
                cloned.width = this.width;
                cloned.info = this.info;
                return cloned;
            };
            /**
             * 矩形是否在另一个矩形内部
             * @param otherRect {PackerRect}
             */
            PackerRect.prototype.isIn = function (otherRect) {
                return (this.x >= otherRect.x &&
                    this.y >= otherRect.y &&
                    this.x + this.width <= otherRect.x + otherRect.width &&
                    this.y + this.height <= otherRect.y + otherRect.height);
            };
            return PackerRect;
        }());
        web.PackerRect = PackerRect;
        __reflect(PackerRect.prototype, "egret.web.PackerRect");
        var FindPosition;
        (function (FindPosition) {
            FindPosition[FindPosition["ShortSideFit"] = 0] = "ShortSideFit";
            FindPosition[FindPosition["BottomLeft"] = 1] = "BottomLeft";
            FindPosition[FindPosition["ContactPoint"] = 2] = "ContactPoint";
            FindPosition[FindPosition["LongSideFit"] = 3] = "LongSideFit";
            FindPosition[FindPosition["AreaFit"] = 4] = "AreaFit";
        })(FindPosition = web.FindPosition || (web.FindPosition = {}));
        var MaxRectBinPack = /** @class */ (function () {
            /**
             * 构建方程
             * @param width {number} 画板宽度
             * @param height {number} 画板高度
             * @param allowRotate {boolean} 允许旋转
             */
            function MaxRectBinPack(width, height, allowRotate) {
                this.freeRects = [];
                this.usedRects = [];
                this.usedRectsMap = {};
                this.containerHeight = height;
                this.containerWidth = width;
                this.allowRotate = allowRotate === true;
                var rect = new PackerRect();
                rect.x = 0;
                rect.y = 0;
                rect.width = width;
                rect.height = height;
                this.freeRects.push(rect);
            }
            /**
             * 在线算法入口 插入矩形方法
             * @param width {number}
             * @param height {number}
             * @param method {FindPosition}
             */
            MaxRectBinPack.prototype.insert = function (id, width, height, method) {
                // width height 参数合法性检查
                if (width <= 0 || height <= 0) {
                    throw new Error("width & height should greater than 0, but got width as " + width + ", height as " + height);
                }
                // method 合法性检查
                if (method <= FindPosition.ShortSideFit || method >= FindPosition.AreaFit) {
                    method = FindPosition.ShortSideFit;
                }
                var newRect = new PackerRect();
                var score1 = {
                    value: 0,
                };
                var score2 = {
                    value: 0,
                };
                switch (method) {
                    case FindPosition.ShortSideFit:
                        newRect = this.findPositionForNewNodeBestShortSideFit(width, height, score1, score2);
                        break;
                    case FindPosition.BottomLeft:
                        newRect = this.findPositionForNewNodeBottomLeft(width, height, score1, score2);
                        break;
                    case FindPosition.ContactPoint:
                        newRect = this.findPositionForNewNodeContactPoint(width, height, score1);
                        break;
                    case FindPosition.LongSideFit:
                        newRect = this.findPositionForNewNodeBestLongSideFit(width, height, score2, score1);
                        break;
                    case FindPosition.AreaFit:
                        newRect = this.findPositionForNewNodeBestAreaFit(width, height, score1, score2);
                        break;
                }
                if (newRect.height === 0) {
                    return newRect;
                }
                newRect.id = id;
                if (this.allowRotate) { // 更新旋转属性
                    if (newRect.height === height && newRect.width === width) {
                        newRect.isRotated = false;
                    }
                    else {
                        // TODO: check is really rotated
                        newRect.isRotated = true;
                    }
                }
                this.placeRectangle(id, newRect);
                return newRect;
            };
            MaxRectBinPack.prototype.removeRect = function (id) {
                if (this.usedRectsMap[id]) {
                    var rect = this.usedRectsMap[id].clone();
                    this.freeRects.push(rect);
                    delete this.usedRectsMap[id];
                }
                return true;
            };
            /**
             * 算法离线入口 插入一组举行
             * @param rects {PackerRect[]} 矩形数组
             * @param method {FindPosition} 查找位置的方法
             */
            MaxRectBinPack.prototype.insertRects = function (ids, rects, method) {
                // rects 参数合法性检查
                if (rects && rects.length === 0) {
                    throw new Error('rects should be array with length greater than zero');
                }
                // method 合法性检查
                if (method <= FindPosition.ShortSideFit || method >= FindPosition.AreaFit) {
                    method = FindPosition.ShortSideFit;
                }
                var result = [];
                while (rects.length > 0) {
                    var bestScore1 = {
                        value: Infinity,
                    };
                    var bestScore2 = {
                        value: Infinity,
                    };
                    var bestRectIndex = -1;
                    var bestNode = void 0;
                    for (var i = 0; i < rects.length; ++i) {
                        var score1 = {
                            value: 0,
                        };
                        var score2 = {
                            value: 0,
                        };
                        var newNode = this.scoreRectangle(rects[i].width, rects[i].height, method, score1, score2);
                        if (score1.value < bestScore1.value ||
                            (score1.value === bestScore1.value && score2.value < bestScore2.value)) {
                            bestScore1.value = score1.value;
                            bestScore2.value = score2.value;
                            bestNode = newNode;
                            bestRectIndex = i;
                        }
                    }
                    if (bestRectIndex === -1) {
                        return result;
                    }
                    if (bestNode) {
                        this.placeRectangle(ids[bestRectIndex], bestNode);
                        bestNode.info = rects[bestRectIndex].info;
                        if (this.allowRotate) {
                            if (bestNode.height === rects[bestRectIndex].height &&
                                bestNode.width === rects[bestRectIndex].width) {
                                bestNode.isRotated = false;
                            }
                            else {
                                bestNode.isRotated = true;
                            }
                        }
                        rects.splice(bestRectIndex, 1);
                        result.push(bestNode);
                    }
                }
                return result;
            };
            MaxRectBinPack.prototype.occupancy = function () {
                var usedSurfaceArea = 0;
                // for (const rect of this.usedRects) {
                //     usedSurfaceArea += rect.width * rect.height;
                // }
                for (var k in this.usedRectsMap) {
                    var rect = this.usedRectsMap[k];
                    usedSurfaceArea += rect.width * rect.height;
                }
                return usedSurfaceArea / (this.containerWidth * this.containerHeight);
            };
            /**
             *
             * @param node
             */
            MaxRectBinPack.prototype.placeRectangle = function (id, node) {
                var numRectanglesToProcess = this.freeRects.length;
                for (var i = 0; i < numRectanglesToProcess; i++) {
                    if (this.splitFreeNode(this.freeRects[i], node)) {
                        this.freeRects.splice(i, 1);
                        i--;
                        numRectanglesToProcess--;
                    }
                }
                this.pruneFreeList();
                // this.usedRects.push(node);
                this.usedRectsMap[id] = node;
            };
            MaxRectBinPack.prototype.scoreRectangle = function (width, height, method, score1, score2) {
                var newNode = new PackerRect();
                score1.value = Infinity;
                score2.value = Infinity;
                switch (method) {
                    case FindPosition.ShortSideFit:
                        newNode = this.findPositionForNewNodeBestShortSideFit(width, height, score1, score2);
                        break;
                    case FindPosition.BottomLeft:
                        newNode = this.findPositionForNewNodeBottomLeft(width, height, score1, score2);
                        break;
                    case FindPosition.ContactPoint:
                        newNode = this.findPositionForNewNodeContactPoint(width, height, score1);
                        // todo: reverse
                        score1.value = -score1.value; // Reverse since we are minimizing, but for contact point score bigger is better.
                        break;
                    case FindPosition.LongSideFit:
                        newNode = this.findPositionForNewNodeBestLongSideFit(width, height, score2, score1);
                        break;
                    case FindPosition.AreaFit:
                        newNode = this.findPositionForNewNodeBestAreaFit(width, height, score1, score2);
                        break;
                }
                // Cannot fit the current Rectangle.
                if (newNode.height === 0) {
                    score1.value = Infinity;
                    score2.value = Infinity;
                }
                return newNode;
            };
            MaxRectBinPack.prototype.findPositionForNewNodeBottomLeft = function (width, height, bestY, bestX) {
                var freeRects = this.freeRects;
                var bestNode = new PackerRect();
                bestY.value = Infinity;
                var topSideY;
                for (var _i = 0, _a = this.freeRects; _i < _a.length; _i++) {
                    var rect = _a[_i];
                    // Try to place the Rectangle in upright (non-flipped) orientation.
                    if (rect.width >= width && rect.height >= height) {
                        topSideY = rect.y + height;
                        if (topSideY < bestY.value ||
                            (topSideY === bestY.value && rect.x < bestX.value)) {
                            bestNode.x = rect.x;
                            bestNode.y = rect.y;
                            bestNode.width = width;
                            bestNode.height = height;
                            bestY.value = topSideY;
                            bestX.value = rect.x;
                        }
                    }
                    if (this.allowRotate && rect.width >= height && rect.height >= width) {
                        topSideY = rect.y + width;
                        if (topSideY < bestY.value ||
                            (topSideY === bestY.value && rect.x < bestX.value)) {
                            bestNode.x = rect.x;
                            bestNode.y = rect.y;
                            bestNode.width = height;
                            bestNode.height = width;
                            bestY.value = topSideY;
                            bestX.value = rect.x;
                        }
                    }
                }
                return bestNode;
            };
            MaxRectBinPack.prototype.findPositionForNewNodeBestShortSideFit = function (width, height, bestShortSideFit, bestLongSideFit) {
                var bestNode = new PackerRect();
                bestShortSideFit.value = Infinity;
                var leftoverHoriz;
                var leftoverVert;
                var shortSideFit;
                var longSideFit;
                for (var _i = 0, _a = this.freeRects; _i < _a.length; _i++) {
                    var rect = _a[_i];
                    // Try to place the Rectangle in upright (non-flipped) orientation.
                    if (rect.width >= width && rect.height >= height) {
                        leftoverHoriz = Math.abs(rect.width - width);
                        leftoverVert = Math.abs(rect.height - height);
                        shortSideFit = Math.min(leftoverHoriz, leftoverVert);
                        longSideFit = Math.max(leftoverHoriz, leftoverVert);
                        if (shortSideFit < bestShortSideFit.value ||
                            (shortSideFit === bestShortSideFit.value &&
                                longSideFit < bestLongSideFit.value)) {
                            bestNode.x = rect.x;
                            bestNode.y = rect.y;
                            bestNode.width = width;
                            bestNode.height = height;
                            bestShortSideFit.value = shortSideFit;
                            bestLongSideFit.value = longSideFit;
                        }
                    }
                    var flippedLeftoverHoriz = void 0;
                    var flippedLeftoverVert = void 0;
                    var flippedShortSideFit = void 0;
                    var flippedLongSideFit = void 0;
                    if (this.allowRotate && rect.width >= height && rect.height >= width) {
                        flippedLeftoverHoriz = Math.abs(rect.width - height);
                        flippedLeftoverVert = Math.abs(rect.height - width);
                        flippedShortSideFit = Math.min(flippedLeftoverHoriz, flippedLeftoverVert);
                        flippedLongSideFit = Math.max(flippedLeftoverHoriz, flippedLeftoverVert);
                        if (flippedShortSideFit < bestShortSideFit.value ||
                            (flippedShortSideFit === bestShortSideFit.value &&
                                flippedLongSideFit < bestLongSideFit.value)) {
                            bestNode.x = rect.x;
                            bestNode.y = rect.y;
                            bestNode.width = height;
                            bestNode.height = width;
                            bestShortSideFit.value = flippedShortSideFit;
                            bestLongSideFit.value = flippedLongSideFit;
                        }
                    }
                }
                return bestNode;
            };
            MaxRectBinPack.prototype.findPositionForNewNodeBestLongSideFit = function (width, height, bestShortSideFit, bestLongSideFit) {
                var bestNode = new PackerRect();
                bestLongSideFit.value = Infinity;
                var leftoverHoriz;
                var leftoverVert;
                var shortSideFit;
                var longSideFit;
                for (var _i = 0, _a = this.freeRects; _i < _a.length; _i++) {
                    var rect = _a[_i];
                    // Try to place the Rectangle in upright (non-flipped) orientation.
                    if (rect.width >= width && rect.height >= height) {
                        leftoverHoriz = Math.abs(rect.width - width);
                        leftoverVert = Math.abs(rect.height - height);
                        shortSideFit = Math.min(leftoverHoriz, leftoverVert);
                        longSideFit = Math.max(leftoverHoriz, leftoverVert);
                        if (longSideFit < bestLongSideFit.value ||
                            (longSideFit === bestLongSideFit.value &&
                                shortSideFit < bestShortSideFit.value)) {
                            bestNode.x = rect.x;
                            bestNode.y = rect.y;
                            bestNode.width = width;
                            bestNode.height = height;
                            bestShortSideFit.value = shortSideFit;
                            bestLongSideFit.value = longSideFit;
                        }
                    }
                    if (this.allowRotate && rect.width >= height && rect.height >= width) {
                        leftoverHoriz = Math.abs(rect.width - height);
                        leftoverVert = Math.abs(rect.height - width);
                        shortSideFit = Math.min(leftoverHoriz, leftoverVert);
                        longSideFit = Math.max(leftoverHoriz, leftoverVert);
                        if (longSideFit < bestLongSideFit.value ||
                            (longSideFit === bestLongSideFit.value &&
                                shortSideFit < bestShortSideFit.value)) {
                            bestNode.x = rect.x;
                            bestNode.y = rect.y;
                            bestNode.width = height;
                            bestNode.height = width;
                            bestShortSideFit.value = shortSideFit;
                            bestLongSideFit.value = longSideFit;
                        }
                    }
                }
                return bestNode;
            };
            MaxRectBinPack.prototype.findPositionForNewNodeBestAreaFit = function (width, height, bestAreaFit, bestShortSideFit) {
                var bestNode = new PackerRect();
                bestAreaFit.value = Infinity;
                var leftoverHoriz;
                var leftoverVert;
                var shortSideFit;
                var areaFit;
                for (var _i = 0, _a = this.freeRects; _i < _a.length; _i++) {
                    var rect = _a[_i];
                    areaFit = rect.width * rect.height - width * height;
                    // Try to place the Rectangle in upright (non-flipped) orientation.
                    if (rect.width >= width && rect.height >= height) {
                        leftoverHoriz = Math.abs(rect.width - width);
                        leftoverVert = Math.abs(rect.height - height);
                        shortSideFit = Math.min(leftoverHoriz, leftoverVert);
                        if (areaFit < bestAreaFit.value ||
                            (areaFit === bestAreaFit.value &&
                                shortSideFit < bestShortSideFit.value)) {
                            bestNode.x = rect.x;
                            bestNode.y = rect.y;
                            bestNode.width = width;
                            bestNode.height = height;
                            bestShortSideFit.value = shortSideFit;
                            bestAreaFit.value = areaFit;
                        }
                    }
                    if (this.allowRotate && rect.width >= height && rect.height >= width) {
                        leftoverHoriz = Math.abs(rect.width - height);
                        leftoverVert = Math.abs(rect.height - width);
                        shortSideFit = Math.min(leftoverHoriz, leftoverVert);
                        if (areaFit < bestAreaFit.value ||
                            (areaFit === bestAreaFit.value &&
                                shortSideFit < bestShortSideFit.value)) {
                            bestNode.x = rect.x;
                            bestNode.y = rect.y;
                            bestNode.width = height;
                            bestNode.height = width;
                            bestShortSideFit.value = shortSideFit;
                            bestAreaFit.value = areaFit;
                        }
                    }
                }
                return bestNode;
            };
            MaxRectBinPack.prototype.commonIntervalLength = function (i1start, i1end, i2start, i2end) {
                if (i1end < i2start || i2end < i1start) {
                    return 0;
                }
                return Math.min(i1end, i2end) - Math.max(i1start, i2start);
            };
            MaxRectBinPack.prototype.contactPointScoreNode = function (x, y, width, height) {
                var score = 0;
                if (x === 0 || x + width === this.containerWidth) {
                    score += height;
                }
                if (y === 0 || y + height === this.containerHeight) {
                    score += width;
                }
                // for (const rect of this.usedRects) {
                //     if (rect.x === x + width || rect.x + rect.width === x) {
                //         score += this.commonIntervalLength(
                //             rect.y,
                //             rect.y + rect.height,
                //             y,
                //             y + height,
                //         );
                //     }
                //     if (rect.y === y + height || rect.y + rect.height === y) {
                //         score += this.commonIntervalLength(
                //             rect.x,
                //             rect.x + rect.width,
                //             x,
                //             x + width,
                //         );
                //     }
                // }
                for (var k in this.usedRectsMap) {
                    var rect = this.usedRectsMap[k];
                    if (rect.x === x + width || rect.x + rect.width === x) {
                        score += this.commonIntervalLength(rect.y, rect.y + rect.height, y, y + height);
                    }
                    if (rect.y === y + height || rect.y + rect.height === y) {
                        score += this.commonIntervalLength(rect.x, rect.x + rect.width, x, x + width);
                    }
                }
                return score;
            };
            MaxRectBinPack.prototype.findPositionForNewNodeContactPoint = function (width, height, bestContactScore) {
                var bestNode = new PackerRect();
                bestContactScore.value = -1;
                var score;
                for (var _i = 0, _a = this.freeRects; _i < _a.length; _i++) {
                    var rect = _a[_i];
                    // Try to place the Rectangle in upright (non-flipped) orientation.
                    if (rect.width >= width && rect.height >= height) {
                        score = this.contactPointScoreNode(rect.x, rect.y, width, height);
                        if (score > bestContactScore.value) {
                            bestNode.x = rect.x;
                            bestNode.y = rect.y;
                            bestNode.width = width;
                            bestNode.height = height;
                            bestContactScore.value = score;
                        }
                    }
                    if (this.allowRotate && rect.width >= height && rect.height >= width) {
                        score = this.contactPointScoreNode(rect.x, rect.y, height, width);
                        if (score > bestContactScore.value) {
                            bestNode.x = rect.x;
                            bestNode.y = rect.y;
                            bestNode.width = height;
                            bestNode.height = width;
                            bestContactScore.value = score;
                        }
                    }
                }
                return bestNode;
            };
            MaxRectBinPack.prototype.splitFreeNode = function (freeNode, usedNode) {
                var freeRectangles = this.freeRects;
                // Test with SAT if the Rectangles even intersect.
                if (usedNode.x >= freeNode.x + freeNode.width || usedNode.x + usedNode.width <= freeNode.x ||
                    usedNode.y >= freeNode.y + freeNode.height || usedNode.y + usedNode.height <= freeNode.y) {
                    return false;
                }
                var newNode;
                if (usedNode.x < freeNode.x + freeNode.width && usedNode.x + usedNode.width > freeNode.x) {
                    // New node at the top side of the used node.
                    if (usedNode.y > freeNode.y && usedNode.y < freeNode.y + freeNode.height) {
                        newNode = freeNode.clone();
                        newNode.height = usedNode.y - newNode.y;
                        freeRectangles.push(newNode);
                    }
                    // New node at the bottom side of the used node.
                    if (usedNode.y + usedNode.height < freeNode.y + freeNode.height) {
                        newNode = freeNode.clone();
                        newNode.y = usedNode.y + usedNode.height;
                        newNode.height = freeNode.y + freeNode.height - (usedNode.y + usedNode.height);
                        freeRectangles.push(newNode);
                    }
                }
                if (usedNode.y < freeNode.y + freeNode.height && usedNode.y + usedNode.height > freeNode.y) {
                    // New node at the left side of the used node.
                    if (usedNode.x > freeNode.x && usedNode.x < freeNode.x + freeNode.width) {
                        newNode = freeNode.clone();
                        newNode.width = usedNode.x - newNode.x;
                        freeRectangles.push(newNode);
                    }
                    // New node at the right side of the used node.
                    if (usedNode.x + usedNode.width < freeNode.x + freeNode.width) {
                        newNode = freeNode.clone();
                        newNode.x = usedNode.x + usedNode.width;
                        newNode.width = freeNode.x + freeNode.width - (usedNode.x + usedNode.width);
                        freeRectangles.push(newNode);
                    }
                }
                return true;
            };
            MaxRectBinPack.prototype.pruneFreeList = function () {
                var freeRectangles = this.freeRects;
                for (var i = 0; i < freeRectangles.length; i++) {
                    for (var j = i + 1; j < freeRectangles.length; j++) {
                        if (freeRectangles[i].isIn(freeRectangles[j])) {
                            freeRectangles.splice(i, 1);
                            break;
                        }
                        if (freeRectangles[j].isIn(freeRectangles[i])) {
                            freeRectangles.splice(j, 1);
                        }
                    }
                }
            };
            return MaxRectBinPack;
        }());
        web.MaxRectBinPack = MaxRectBinPack;
        __reflect(MaxRectBinPack.prototype, "egret.web.MaxRectBinPack");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * 表示合图Atlas中一个格子，一般情况下是一个Rect
         * 用来维护格子
         */
        var AtlasGrid = /** @class */ (function (_super) {
            __extends(AtlasGrid, _super);
            function AtlasGrid() {
                var _this = _super.call(this) || this;
                /** 引用计数 */
                _this.refCount = 0;
                _this.$width = 0;
                _this.$height = 0;
                _this.$offsetX = 0;
                _this.$offsetY = 0;
                return _this;
            }
            Object.defineProperty(AtlasGrid.prototype, "width", {
                get: function () {
                    return this.$width;
                },
                set: function (value) {
                    this.$width = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(AtlasGrid.prototype, "height", {
                get: function () {
                    return this.$height;
                },
                set: function (value) {
                    this.$height = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(AtlasGrid.prototype, "offsetX", {
                get: function () {
                    return this.$offsetX;
                },
                set: function (value) {
                    this.$offsetX = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(AtlasGrid.prototype, "offsetY", {
                get: function () {
                    return this.$offsetY;
                },
                set: function (value) {
                    this.$offsetY = value;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * 释放
             */
            AtlasGrid.prototype.dispose = function () {
                return true;
            };
            AtlasGrid.prototype.releaseGrid = function () {
            };
            return AtlasGrid;
        }(egret.HashObject));
        web.AtlasGrid = AtlasGrid;
        __reflect(AtlasGrid.prototype, "egret.web.AtlasGrid");
        /**
         * 表示一张合图Atlas
         */
        var TextureAtlas = /** @class */ (function (_super) {
            __extends(TextureAtlas, _super);
            function TextureAtlas(webGLRenderContext, width, height) {
                var _this = _super.call(this) || this;
                /**
                 * Atlas宽高
                 */
                _this.atlasWidth = 0;
                _this.atlasHeight = 0;
                /** Atals面积 */
                _this.atlasArea = 0;
                /**
                 * 间隔
                 */
                _this.padding = 1;
                /**
                 * 对应的webGLTexture
                 */
                _this.webGLTexture = null;
                _this.offsetX = 0;
                _this.offsetY = 0;
                /** binPacker */
                _this.binPacker = null;
                /** 空闲面积 */
                _this.freeSpace = 0;
                /**
                 * 当前Atlas缓存的所有Grid
                 */
                _this.atlasGridCache = {};
                _this.webGLRenderContext = null;
                _this.webGLRenderContext = webGLRenderContext;
                _this.atlasWidth = width;
                _this.atlasHeight = height;
                _this.atlasArea = width * height;
                _this.freeSpace = width * height;
                _this.webGLTexture = _this.createAtlasTexture();
                _this.webGLTexture["atlasTexture"] = true;
                _this.webGLTexture["textureWidth"] = _this.atlasWidth;
                _this.webGLTexture["textureHeight"] = _this.atlasHeight;
                _this.binPacker = new web.MaxRectBinPack(_this.atlasWidth, _this.atlasHeight, false);
                return _this;
            }
            /**
             * 创建纹理
             */
            TextureAtlas.prototype.createAtlasTexture = function () {
                var debug = false;
                if (debug) {
                    //做一个黑底子的，方便调试代码
                    var canvas = egret.sys.createCanvas(this.atlasWidth, this.atlasWidth);
                    var context = egret.sys.getContext2d(canvas);
                    context.fillStyle = 'blue';
                    context.fillRect(0, 0, this.atlasWidth, this.atlasWidth);
                    return egret.sys.createTexture(this.webGLRenderContext, canvas);
                }
                else {
                    return egret.sys._createTexture(this.webGLRenderContext, this.atlasWidth, this.atlasHeight, null);
                }
            };
            /**
             * 添加散图，返回对应uv
             * @param bitmapData
             */
            TextureAtlas.prototype.addTexture = function (bitmapData) {
                var id = TextureAtlasManager.getGirdID(bitmapData["uriValue"]);
                var targetGrid = this.getGrid(id);
                var padding = this.padding;
                if (!targetGrid) {
                    var result = this.binPacker.insert(id, bitmapData.width + padding * 2, bitmapData.height + padding * 2, web.FindPosition.AreaFit);
                    if (result.width == 0 && result.height == 0) {
                        // console.warn("binPacker insert failed");
                        return false;
                    }
                    this.offsetX = result.x;
                    this.offsetY = result.y;
                    targetGrid = new AtlasGrid();
                    targetGrid.id = id;
                    targetGrid.offsetX = this.offsetX;
                    targetGrid.offsetY = this.offsetY;
                    targetGrid.width = result.width;
                    targetGrid.height = result.height;
                    this.atlasGridCache[id] = targetGrid;
                    this.pushData(bitmapData, this.offsetX + padding, this.offsetY + padding);
                    //减去被用的
                    this.freeSpace -= result.width * result.height;
                }
                else {
                    targetGrid.refCount += 1;
                }
                return true;
            };
            /**
             * 激活当前Grid,webGLTexture中属性更新为当前激活Grid对应属性
             * @param bitmapData
             */
            TextureAtlas.prototype.activeGrid = function (id) {
                var targetGrid = this.getGrid(id);
                var padding = this.padding;
                if (!targetGrid) {
                    return;
                }
                //update current uv
                this.webGLTexture["textureSourceX"] = targetGrid.offsetX + padding;
                this.webGLTexture["textureSourceY"] = targetGrid.offsetY + padding;
                this.webGLTexture["textureSourceWidth"] = targetGrid.width;
                this.webGLTexture["textureSourceHeight"] = targetGrid.height;
            };
            /**
             * 填充纹理数据
             */
            TextureAtlas.prototype.pushData = function (bitmapData, offsetX, offsetY) {
                var gl = this.webGLRenderContext.context;
                this.webGLTexture[egret.glContext] = gl;
                gl.bindTexture(gl.TEXTURE_2D, this.webGLTexture);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
                this.webGLTexture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL] = true;
                gl.texSubImage2D(gl.TEXTURE_2D, 0, offsetX, offsetY, gl.RGBA, gl.UNSIGNED_BYTE, bitmapData);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
            };
            /** 重置某个清理 */
            TextureAtlas.prototype.resetData = function (offsetX, offsetY, width, height) {
                var gl = this.webGLRenderContext.context;
                this.webGLTexture[egret.glContext] = gl;
                gl.bindTexture(gl.TEXTURE_2D, this.webGLTexture);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
                this.webGLTexture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL] = true;
                gl.texSubImage2D(gl.TEXTURE_2D, 0, offsetX, offsetY, width, height, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(width * height * 4));
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
            };
            TextureAtlas.prototype.updateData = function (bitmapData, offsetX, offsetY) {
                var gl = this.webGLRenderContext.context;
                gl.bindTexture(gl.TEXTURE_2D, this.webGLTexture);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
                this.webGLTexture[egret.UNPACK_PREMULTIPLY_ALPHA_WEBGL] = true;
                gl.texSubImage2D(gl.TEXTURE_2D, 0, offsetX, offsetY, gl.RGBA, gl.UNSIGNED_BYTE, bitmapData);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
            };
            /**
             * 移除纹理
             * 其实就是将对应纹理所占区域设为可用
             */
            TextureAtlas.prototype.removeGrid = function (id) {
                var atlasGridCache = this.atlasGridCache;
                if (atlasGridCache[id]) {
                    var targetGrid = atlasGridCache[id];
                    if (targetGrid.refCount == 0) {
                        //清理区域
                        this.resetData(targetGrid.offsetX, targetGrid.offsetY, targetGrid.width, targetGrid.height);
                        //增加面积
                        this.freeSpace += targetGrid.width * targetGrid.height;
                        atlasGridCache[id].releaseGrid();
                        delete atlasGridCache[id];
                        this.binPacker.removeRect(id);
                    }
                }
            };
            /**
             * 更新纹理
             */
            TextureAtlas.prototype.updateGrid = function (id, bitmapData) {
                var atlasGridCache = this.atlasGridCache;
                if (atlasGridCache[id]) {
                    var targetGrid = atlasGridCache[id];
                    //清理区域
                    this.updateData(bitmapData, targetGrid.offsetX, targetGrid.offsetY);
                }
            };
            /**
             * 通过id获取对应grid
             */
            TextureAtlas.prototype.getGrid = function (id) {
                var targetGrid = this.atlasGridCache[id];
                return targetGrid;
            };
            /**
             * 释放
             */
            TextureAtlas.prototype.dispose = function () {
                if (this.atlasGridCache) {
                    var atlasGridCache = this.atlasGridCache;
                    for (var k in atlasGridCache) {
                        atlasGridCache[k].dispose();
                    }
                    this.atlasGridCache = null;
                }
                if (this.webGLTexture) {
                    egret.WebGLUtils.deleteWebGLTexture(this.webGLTexture);
                    this.webGLTexture = null;
                }
                return true;
            };
            return TextureAtlas;
        }(egret.HashObject));
        web.TextureAtlas = TextureAtlas;
        __reflect(TextureAtlas.prototype, "egret.web.TextureAtlas");
        /**
         * @private
         * 合图Atlas管理器
         * 用来维护自动合图Atlas
         */
        var TextureAtlasManager = /** @class */ (function (_super) {
            __extends(TextureAtlasManager, _super);
            function TextureAtlasManager(webglRenderContext) {
                var _this = _super.call(this) || this;
                /**
                 * Atlas宽高
                 */
                _this.atlasWidth = 2048;
                _this.atlasHeight = 2048;
                /**
                 * 允许添加到Atlas最大宽高
                 */
                _this.textureMaxWidth = 512;
                _this.textureMaxHeight = 512;
                /**
                 * 最多缓存atlas数量
                 */
                _this.maxAtlasCount = 10;
                /**
                 * 最多尝试次数，不成功就不加入合图
                 */
                _this.limitTryAddTimes = 2;
                /**
                 * 缓存的Atlas
                 */
                _this.atlasCache = [];
                _this.webGLRenderContext = null;
                /** debug时显示Atlas所在精灵 */
                _this.debugShowAtlasAttachNode = null;
                _this.currAtlasIdx = 0;
                _this.webGLRenderContext = webglRenderContext;
                return _this;
            }
            TextureAtlasManager.createTexture = function (context, bitmapData) {
                if (!context || !bitmapData) {
                    return;
                }
                if (!this.instance) {
                    this.instance = new TextureAtlasManager(context);
                    egret.sys.textureAtlasManager = this.instance;
                }
                return this.instance.addToAtlas(bitmapData);
            };
            /**
             * 更新Texture
             * @param uri
             */
            TextureAtlasManager.updateTexture = function (uri, bitmapData) {
                if (!bitmapData || !this.instance) {
                    return false;
                }
                return this.instance.updateTexture(uri, bitmapData);
            };
            /** 通过资源路径获取唯一ID */
            TextureAtlasManager.getGirdID = function (uri) {
                if (typeof (uri) === 'number') {
                    uri = uri.toString();
                }
                return egret.NumberUtils.convertStringToHashCode(uri);
            };
            /**
             * 激活对应Texture
             * @param bitmapData
             */
            TextureAtlasManager.activeTexture = function (uri) {
                if (!this.instance) {
                    return false;
                }
                this.instance.activeTexture(uri);
                return true;
            };
            /**
             * 移除对应Texture
             */
            TextureAtlasManager.removeTexture = function (uri) {
                if (!this.instance) {
                    return false;
                }
                this.instance.removeTexture(uri);
                return true;
            };
            /**
             * 激活对应纹理
             */
            TextureAtlasManager.prototype.activeTexture = function (uri) {
                var targetAtlas = null;
                var id = TextureAtlasManager.getGirdID(uri);
                var len = this.atlasCache.length;
                var atlasCache = this.atlasCache;
                for (var i = 0; i < len; i++) {
                    var tmpAtlas = atlasCache[i];
                    if (tmpAtlas.getGrid(id)) {
                        targetAtlas = tmpAtlas;
                        break;
                    }
                }
                if (targetAtlas) {
                    targetAtlas.activeGrid(id);
                }
            };
            /**
             * 移除纹理
             * @param uri
             */
            TextureAtlasManager.prototype.removeTexture = function (uri) {
                if (!uri) {
                    return;
                }
                var targetAtlas = null;
                var id = TextureAtlasManager.getGirdID(uri);
                var len = this.atlasCache.length;
                var atlasCache = this.atlasCache;
                for (var i = 0; i < len; i++) {
                    var tmpAtlas = atlasCache[i];
                    if (tmpAtlas.getGrid(id)) {
                        targetAtlas = tmpAtlas;
                        break;
                    }
                }
                if (targetAtlas) {
                    targetAtlas.removeGrid(id);
                }
            };
            /** 显示当前所有Atlas */
            TextureAtlasManager.prototype.showAtlas = function () {
                if (!this.debugShowAtlasAttachNode) {
                    this.debugShowAtlasAttachNode = new egret.Sprite();
                    this.debugShowAtlasAttachNode.name = "debugShowAtlasAttachNode";
                    //加到当前舞台
                    this.debugShowAtlasAttachNode.x = 50;
                    this.debugShowAtlasAttachNode.y = 50;
                    egret.web.globalStage.addChild(this.debugShowAtlasAttachNode);
                }
                var len = this.atlasCache.length;
                var atlasCache = this.atlasCache;
                for (var i = 0; i < len; i++) {
                    if (this.debugShowAtlasAttachNode.getChildByName('atlasNode_' + i)) {
                        continue;
                    }
                    var bitmapData = new egret.BitmapData(null);
                    bitmapData.webGLTexture = atlasCache[i].webGLTexture;
                    bitmapData.width = 2048;
                    bitmapData.height = 2048;
                    bitmapData.isAtlas = true;
                    var tex = new egret.Texture();
                    tex.bitmapData = bitmapData;
                    var bitmap = new egret.Bitmap(tex);
                    bitmap.width = 512;
                    bitmap.height = 512;
                    // bitmap.scaleX = bitmap.scaleY = 0.5;
                    bitmap.name = "atlasNode_" + i;
                    bitmap.x = 512 * 0;
                    bitmap.y = 512 * (i % 3);
                    bitmap.alpha = 0.7;
                    this.debugShowAtlasAttachNode.addChild(bitmap);
                }
            };
            /**
             * 获取一张可用的Atlas
             */
            TextureAtlasManager.prototype.getBestAtlas = function () {
                var targetAtlas = null;
                var len = this.atlasCache.length;
                var atlasCache = this.atlasCache;
                var idx = this.currAtlasIdx;
                if (idx >= len) {
                    var needCount = idx + 1 - len;
                    for (var i = 0; i < needCount; i++) {
                        var newAtlas = new TextureAtlas(this.webGLRenderContext, this.atlasWidth, this.atlasHeight);
                        atlasCache.push(newAtlas);
                    }
                }
                targetAtlas = atlasCache[idx];
                return targetAtlas;
            };
            /**
             * 指向下一个最适合添加的Atlas
             */
            TextureAtlasManager.prototype.nextBestAtlas = function (bitmapData) {
                var atlasCount = this.atlasCache.length;
                var altasCache = this.atlasCache;
                var addArea = bitmapData.width * bitmapData.height;
                if (atlasCount < 2) {
                    this.currAtlasIdx += 1;
                    return true;
                }
                var targetIdx = this.currAtlasIdx > 0 ? (this.currAtlasIdx - 1) : (atlasCount - 1);
                var targetAtlas = altasCache[targetIdx];
                //粗粒度剪枝，如果可用面积不够肯定不允许
                var found = false;
                while (targetIdx != this.currAtlasIdx) {
                    if (addArea < targetAtlas.freeSpace) {
                        found = true;
                        break;
                    }
                    targetIdx = targetIdx > 0 ? (targetIdx - 1) : (atlasCount - 1);
                    targetAtlas = altasCache[targetIdx];
                }
                if (found) {
                    this.currAtlasIdx = targetIdx;
                    return true;
                }
                else {
                    if (atlasCount < this.maxAtlasCount) {
                        //如果找不到而且还未达到最大Atlas数量，创建新的Atlas
                        this.currAtlasIdx = atlasCount;
                    }
                    else {
                        //如果不能创建新的，就前一张
                        this.currAtlasIdx = this.currAtlasIdx > 0 ? (this.currAtlasIdx - 1) : (atlasCount - 1);
                    }
                }
                return true;
            };
            /**
             * 是否允许添加到Atals
             * @param bitmapData
             */
            TextureAtlasManager.prototype.allow = function (bitmapData) {
                return bitmapData.width < this.textureMaxWidth
                    && bitmapData.height < this.textureMaxHeight;
            };
            /**
             *
             * @param atlas
             * @param bitmapData
             */
            TextureAtlasManager.prototype.addTextureToAtlas = function (atlas, bitmapData) {
                var result = atlas.addTexture(bitmapData);
                if (!result) {
                    //如果失败，换成另一张Atlas
                    this.nextBestAtlas(bitmapData);
                }
                return result;
            };
            /**
             * 添加一张图片到Atlas
             * @param bitmapData
             */
            TextureAtlasManager.prototype.addToAtlas = function (bitmapData) {
                if (this.allow(bitmapData)) {
                    var tryAddTimes = 0;
                    var limitTryAddTimes = this.limitTryAddTimes;
                    var targetAtlas = this.getBestAtlas();
                    while (!this.addTextureToAtlas(targetAtlas, bitmapData) && tryAddTimes < limitTryAddTimes) {
                        targetAtlas = this.getBestAtlas();
                        tryAddTimes += 1;
                    }
                    if (tryAddTimes >= limitTryAddTimes) {
                        //找不到
                        return null;
                    }
                    // this.showAtlas();
                    return targetAtlas.webGLTexture;
                }
                return null;
            };
            /**
             * 更新texture
             * @param uri
             * @param BitmapData
             */
            TextureAtlasManager.prototype.updateTexture = function (uri, bitmapData) {
                if (!uri) {
                    return false;
                }
                var targetAtlas = null;
                var targetGrid = null;
                var id = TextureAtlasManager.getGirdID(uri);
                var len = this.atlasCache.length;
                var atlasCache = this.atlasCache;
                for (var i = 0; i < len; i++) {
                    var tmpAtlas = atlasCache[i];
                    var tmpGrid = tmpAtlas.getGrid(id);
                    if (tmpGrid) {
                        targetAtlas = tmpAtlas;
                        targetGrid = tmpGrid;
                        break;
                    }
                }
                if (targetGrid) {
                    if (targetGrid.width != bitmapData.width || targetGrid.height != bitmapData.height) {
                        // //如果宽高有变化，需要先清理之前的再添加
                        // this.removeTexture(uri);
                        // //TODO-如果失败处理
                        // targetAtlas.addTexture(bitmapData);
                        return false;
                    }
                    else {
                        //宽高没变，直接覆盖
                        targetAtlas.updateGrid(targetGrid.id, bitmapData);
                    }
                    return true;
                }
                return false;
            };
            return TextureAtlasManager;
        }(egret.HashObject));
        web.TextureAtlasManager = TextureAtlasManager;
        __reflect(TextureAtlasManager.prototype, "egret.web.TextureAtlasManager");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var EgretWebGLAttribute = /** @class */ (function () {
            function EgretWebGLAttribute(gl, program, attributeData) {
                this.gl = gl;
                this.name = attributeData.name;
                this.type = attributeData.type;
                this.size = attributeData.size;
                this.location = gl.getAttribLocation(program, this.name);
                this.count = 0;
                this.initCount(gl);
                this.format = gl.FLOAT;
                this.initFormat(gl);
            }
            EgretWebGLAttribute.prototype.initCount = function (gl) {
                var type = this.type;
                switch (type) {
                    case 5126 /* FLOAT */:
                    case 5120 /* BYTE */:
                    case 5121 /* UNSIGNED_BYTE */:
                    case 5123 /* UNSIGNED_SHORT */:
                        this.count = 1;
                        break;
                    case 35664 /* FLOAT_VEC2 */:
                        this.count = 2;
                        break;
                    case 35665 /* FLOAT_VEC3 */:
                        this.count = 3;
                        break;
                    case 35666 /* FLOAT_VEC4 */:
                        this.count = 4;
                        break;
                }
            };
            EgretWebGLAttribute.prototype.initFormat = function (gl) {
                var type = this.type;
                switch (type) {
                    case 5126 /* FLOAT */:
                    case 35664 /* FLOAT_VEC2 */:
                    case 35665 /* FLOAT_VEC3 */:
                    case 35666 /* FLOAT_VEC4 */:
                        this.format = gl.FLOAT;
                        break;
                    case 5121 /* UNSIGNED_BYTE */:
                        this.format = gl.UNSIGNED_BYTE;
                        break;
                    case 5123 /* UNSIGNED_SHORT */:
                        this.format = gl.UNSIGNED_SHORT;
                        break;
                    case 5120 /* BYTE */:
                        this.format = gl.BYTE;
                        break;
                }
            };
            return EgretWebGLAttribute;
        }());
        web.EgretWebGLAttribute = EgretWebGLAttribute;
        __reflect(EgretWebGLAttribute.prototype, "egret.web.EgretWebGLAttribute");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        function loadShader(gl, type, source) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if (!compiled) {
                console.log("shader not compiled!");
                console.log(source);
                console.log(gl.getShaderInfoLog(shader));
            }
            return shader;
        }
        function createWebGLProgram(gl, vertexShader, fragmentShader) {
            var program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            var message = gl.getProgramInfoLog(program);
            if (message && message.length > 0) {
                console.log("program not linked!");
                console.log(message);
            }
            return program;
        }
        function extractAttributes(gl, program) {
            var attributes = {};
            var totalAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
            for (var i = 0; i < totalAttributes; i++) {
                var attribData = gl.getActiveAttrib(program, i);
                var name_2 = attribData.name;
                var attribute = new web.EgretWebGLAttribute(gl, program, attribData);
                attributes[name_2] = attribute;
            }
            return attributes;
        }
        function extractUniforms(gl, program) {
            var uniforms = {};
            var totalUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
            for (var i = 0; i < totalUniforms; i++) {
                var uniformData = gl.getActiveUniform(program, i);
                var name_3 = uniformData.name;
                var uniform = new web.EgretWebGLUniform(gl, program, uniformData);
                uniforms[name_3] = uniform;
            }
            return uniforms;
        }
        /**
         * @private
         */
        var EgretWebGLProgram = /** @class */ (function () {
            function EgretWebGLProgram(gl, vertSource, fragSource) {
                this.vshaderSource = vertSource;
                this.fshaderSource = fragSource;
                this.vertexShader = loadShader(gl, gl.VERTEX_SHADER, this.vshaderSource);
                this.fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, this.fshaderSource);
                this.id = createWebGLProgram(gl, this.vertexShader, this.fragmentShader);
                this.uniforms = extractUniforms(gl, this.id);
                this.attributes = extractAttributes(gl, this.id);
            }
            EgretWebGLProgram.glProgramKey = function (gl, key) {
                if (gl['id']) {
                    return gl['id'] + key;
                }
                return key;
            };
            /**
             * 获取所需的WebGL Program
             * @param key {string} 对于唯一的program程序，对应唯一的key
             */
            EgretWebGLProgram.getProgram = function (gl, vertSource, fragSource, key) {
                if (!this.programCache[this.glProgramKey(gl, key)]) {
                    this.programCache[this.glProgramKey(gl, key)] = new EgretWebGLProgram(gl, vertSource, fragSource);
                }
                return this.programCache[this.glProgramKey(gl, key)];
            };
            EgretWebGLProgram.setProgram = function (gl, vertSource, fragSource, key) {
                this.programCache[this.glProgramKey(gl, key)] = new EgretWebGLProgram(gl, vertSource, fragSource);
            };
            EgretWebGLProgram.getProgramByKey = function (gl, key, alphaType) {
                if (!this.programAlphaToKey[this.glProgramKey(gl, key)]) {
                    key = this.defaultKey;
                }
                key = this.programAlphaToKey[this.glProgramKey(gl, key)][alphaType];
                if (!this.programCache[this.glProgramKey(gl, key)]) {
                    key = this.defaultKey;
                }
                return this.programCache[this.glProgramKey(gl, key)];
            };
            /**
             * 一般来说每一个shader都需要提供四种类型的shader，以兼容4种alpha的情况，在这个函数里，把4种同类shader归类到一个group
             * @param key group的名字
             * @param subkeyNoMask 普通alpha图片的shader，包括原图，以及astc/etc2这类自带alpha通道的图片
             * @param subkeySeparateMask 独立alpha图片的shader，这类用一张独立的纹理单独保存alpha，所以一共两张图
             * @param subkeyVerticalMask 图片上半部分是rgb，下半部分是alpha的情况
             * @param subkeyHorizontalMask 图片左半部分是rgb，右半边是alpha的情况
             */
            EgretWebGLProgram.groupPrograms = function (gl, key, subkeyNoMask, subkeySeparateMask, subkeyVerticalMask, subkeyHorizontalMask) {
                this.programAlphaToKey[this.glProgramKey(gl, key)] = [subkeyNoMask, subkeySeparateMask, subkeyVerticalMask, subkeyHorizontalMask];
            };
            EgretWebGLProgram.deleteProgram = function (gl, vertSource, fragSource, key) {
                // TODO delete
            };
            EgretWebGLProgram.programCache = {};
            EgretWebGLProgram.programAlphaToKey = {};
            EgretWebGLProgram.defaultKey = "";
            return EgretWebGLProgram;
        }());
        web.EgretWebGLProgram = EgretWebGLProgram;
        __reflect(EgretWebGLProgram.prototype, "egret.web.EgretWebGLProgram");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        /**
         * @private
         */
        var EgretWebGLUniform = /** @class */ (function () {
            function EgretWebGLUniform(gl, program, uniformData) {
                this.gl = gl;
                this.name = uniformData.name;
                this.type = uniformData.type;
                this.size = uniformData.size;
                this.location = gl.getUniformLocation(program, this.name);
                this.setDefaultValue();
                this.generateSetValue();
                this.generateUpload();
            }
            EgretWebGLUniform.prototype.setDefaultValue = function () {
                var type = this.type;
                switch (type) {
                    case 5126 /* FLOAT */:
                    case 35678 /* SAMPLER_2D */:
                    case 35680 /* SAMPLER_CUBE */:
                    case 35670 /* BOOL */:
                    case 5124 /* INT */:
                        this.value = 0;
                        break;
                    case 35664 /* FLOAT_VEC2 */:
                    case 35671 /* BOOL_VEC2 */:
                    case 35667 /* INT_VEC2 */:
                        this.value = [0, 0];
                        break;
                    case 35665 /* FLOAT_VEC3 */:
                    case 35672 /* BOOL_VEC3 */:
                    case 35668 /* INT_VEC3 */:
                        this.value = [0, 0, 0];
                        break;
                    case 35666 /* FLOAT_VEC4 */:
                    case 35673 /* BOOL_VEC4 */:
                    case 35669 /* INT_VEC4 */:
                        this.value = [0, 0, 0, 0];
                        break;
                    case 35674 /* FLOAT_MAT2 */:
                        this.value = new Float32Array([
                            1, 0,
                            0, 1
                        ]);
                        break;
                    case 35675 /* FLOAT_MAT3 */:
                        this.value = new Float32Array([
                            1, 0, 0,
                            0, 1, 0,
                            0, 0, 1
                        ]);
                        break;
                    case 35676 /* FLOAT_MAT4 */:
                        this.value = new Float32Array([
                            1, 0, 0, 0,
                            0, 1, 0, 0,
                            0, 0, 1, 0,
                            0, 0, 0, 1
                        ]);
                        break;
                }
            };
            EgretWebGLUniform.prototype.generateSetValue = function () {
                var type = this.type;
                switch (type) {
                    case 5126 /* FLOAT */:
                    case 35678 /* SAMPLER_2D */:
                    case 35680 /* SAMPLER_CUBE */:
                    case 35670 /* BOOL */:
                    case 5124 /* INT */:
                        this.setValue = function (value) {
                            var notEqual = this.value !== value;
                            this.value = value;
                            notEqual && this.upload();
                        };
                        break;
                    case 35664 /* FLOAT_VEC2 */:
                    case 35671 /* BOOL_VEC2 */:
                    case 35667 /* INT_VEC2 */:
                        this.setValue = function (value) {
                            var notEqual = this.value[0] !== value.x || this.value[1] !== value.y;
                            this.value[0] = value.x;
                            this.value[1] = value.y;
                            notEqual && this.upload();
                        };
                        break;
                    case 35665 /* FLOAT_VEC3 */:
                    case 35672 /* BOOL_VEC3 */:
                    case 35668 /* INT_VEC3 */:
                        this.setValue = function (value) {
                            this.value[0] = value.x;
                            this.value[1] = value.y;
                            this.value[2] = value.z;
                            this.upload();
                        };
                        break;
                    case 35666 /* FLOAT_VEC4 */:
                    case 35673 /* BOOL_VEC4 */:
                    case 35669 /* INT_VEC4 */:
                        this.setValue = function (value) {
                            this.value[0] = value.x;
                            this.value[1] = value.y;
                            this.value[2] = value.z;
                            this.value[3] = value.w;
                            this.upload();
                        };
                        break;
                    case 35674 /* FLOAT_MAT2 */:
                    case 35675 /* FLOAT_MAT3 */:
                    case 35676 /* FLOAT_MAT4 */:
                        this.setValue = function (value) {
                            this.value.set(value);
                            this.upload();
                        };
                        break;
                }
            };
            EgretWebGLUniform.prototype.generateUpload = function () {
                var gl = this.gl;
                var type = this.type;
                var location = this.location;
                switch (type) {
                    case 5126 /* FLOAT */:
                        this.upload = function () {
                            var value = this.value;
                            if (value instanceof Array) {
                                gl.uniform1fv(location, value);
                            }
                            else {
                                gl.uniform1f(location, value);
                            }
                        };
                        break;
                    case 35664 /* FLOAT_VEC2 */:
                        this.upload = function () {
                            var value = this.value;
                            gl.uniform2f(location, value[0], value[1]);
                        };
                        break;
                    case 35665 /* FLOAT_VEC3 */:
                        this.upload = function () {
                            var value = this.value;
                            gl.uniform3f(location, value[0], value[1], value[2]);
                        };
                        break;
                    case 35666 /* FLOAT_VEC4 */:
                        this.upload = function () {
                            var value = this.value;
                            gl.uniform4f(location, value[0], value[1], value[2], value[3]);
                        };
                        break;
                    case 35678 /* SAMPLER_2D */:
                    case 35680 /* SAMPLER_CUBE */:
                    case 35670 /* BOOL */:
                    case 5124 /* INT */:
                        this.upload = function () {
                            var value = this.value;
                            if (value instanceof Array) {
                                gl.uniform1iv(location, value);
                            }
                            else {
                                gl.uniform1i(location, value);
                            }
                        };
                        break;
                    case 35671 /* BOOL_VEC2 */:
                    case 35667 /* INT_VEC2 */:
                        this.upload = function () {
                            var value = this.value;
                            gl.uniform2i(location, value[0], value[1]);
                        };
                        break;
                    case 35672 /* BOOL_VEC3 */:
                    case 35668 /* INT_VEC3 */:
                        this.upload = function () {
                            var value = this.value;
                            gl.uniform3i(location, value[0], value[1], value[2]);
                        };
                        break;
                    case 35673 /* BOOL_VEC4 */:
                    case 35669 /* INT_VEC4 */:
                        this.upload = function () {
                            var value = this.value;
                            gl.uniform4i(location, value[0], value[1], value[2], value[3]);
                        };
                        break;
                    case 35674 /* FLOAT_MAT2 */:
                        this.upload = function () {
                            var value = this.value;
                            gl.uniformMatrix2fv(location, false, value);
                        };
                        break;
                    case 35675 /* FLOAT_MAT3 */:
                        this.upload = function () {
                            var value = this.value;
                            gl.uniformMatrix3fv(location, false, value);
                        };
                        break;
                    case 35676 /* FLOAT_MAT4 */:
                        this.upload = function () {
                            var value = this.value;
                            gl.uniformMatrix4fv(location, false, value);
                        };
                        break;
                }
            };
            return EgretWebGLUniform;
        }());
        web.EgretWebGLUniform = EgretWebGLUniform;
        __reflect(EgretWebGLUniform.prototype, "egret.web.EgretWebGLUniform");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

(function (egret) {
    var web;
    (function (web) {
        var MACRO_DEF_LOW_FLOAT = "precision lowp float;\n";
        var MACRO_DEF_MID_FLOAT = "precision mediump float;\n";
        var MACRO_DEF_HIGH_FLOAT = "precision highp float;\n";
        var MACRO_STR_DEF = "#define ALPHA_MODE_NONE 0\n#define ALPHA_MODE_SEP 1\n#define ALPHA_MODE_VER 2\n#define ALPHA_MODE_HOR 3\n";
        var MACRO_STR_LOW_FLOAT = MACRO_DEF_LOW_FLOAT + MACRO_STR_DEF;
        var MACRO_STR_MID_FLOAT = MACRO_DEF_MID_FLOAT + MACRO_STR_DEF;
        var MACRO_STR_HIGH_FLOAT = MACRO_DEF_HIGH_FLOAT + MACRO_STR_DEF;
        var EgretShaderLib = /** @class */ (function () {
            function EgretShaderLib() {
            }
            EgretShaderLib.blur_frag = "precision mediump float;\r\nuniform vec2 blur;\r\nuniform sampler2D uSampler;\r\nvarying vec2 vTextureCoord;\r\nuniform vec2 uTextureSize;\r\nvoid main()\r\n{\r\n    const int sampleRadius = 5;\r\n    const int samples = sampleRadius * 2 + 1;\r\n    vec2 blurUv = blur / uTextureSize;\r\n    vec4 color = vec4(0, 0, 0, 0);\r\n    vec2 uv = vec2(0.0, 0.0);\r\n    blurUv /= float(sampleRadius);\r\n\r\n    for (int i = -sampleRadius; i <= sampleRadius; i++) {\r\n        uv.x = vTextureCoord.x + float(i) * blurUv.x;\r\n        uv.y = vTextureCoord.y + float(i) * blurUv.y;\r\n        color += texture2D(uSampler, uv);\r\n    }\r\n\r\n    color /= float(samples);\r\n    gl_FragColor = color;\r\n}";
            EgretShaderLib.colorTransform_frag = "precision mediump float;\r\nvarying vec2 vTextureCoord;\r\nvarying vec4 vColor;\r\nuniform mat4 matrix;\r\nuniform vec4 colorAdd;\r\nuniform sampler2D uSampler;\r\n\r\nvoid main(void) {\r\n    vec4 texColor = texture2D(uSampler, vTextureCoord);\r\n    if(texColor.a > 0.) {\r\n        // 抵消预乘的alpha通道\r\n        texColor = vec4(texColor.rgb / texColor.a, texColor.a);\r\n    }\r\n    vec4 locColor = clamp(texColor * matrix + colorAdd, 0., 1.);\r\n    gl_FragColor = vColor * vec4(locColor.rgb * locColor.a, locColor.a);\r\n}";
            EgretShaderLib.default_vert = "attribute vec2 aVertexPosition;\r\nattribute vec2 aTextureCoord;\r\nattribute vec4 aColor;\r\n\r\nuniform vec2 projectionVector;\r\n// uniform vec2 offsetVector;\r\n\r\nvarying vec2 vTextureCoord;\r\nvarying vec4 vColor;\r\n\r\nconst vec2 center = vec2(-1.0, 1.0);\r\n\r\nvoid main(void) {\r\n   gl_Position = vec4( (aVertexPosition / projectionVector) + center , 0.0, 1.0);\r\n   vTextureCoord = aTextureCoord;\r\n   vColor = aColor;\r\n}";
            EgretShaderLib.glow_frag = "precision highp float;\r\nvarying vec2 vTextureCoord;\r\n\r\nuniform sampler2D uSampler;\r\n\r\nuniform float dist;\r\nuniform float angle;\r\nuniform vec4 color;\r\nuniform float alpha;\r\nuniform float blurX;\r\nuniform float blurY;\r\n// uniform vec4 quality;\r\nuniform float strength;\r\nuniform float inner;\r\nuniform float knockout;\r\nuniform float hideObject;\r\n\r\nuniform vec2 uTextureSize;\r\n\r\nfloat random(vec2 scale)\r\n{\r\n    return fract(sin(dot(gl_FragCoord.xy, scale)) * 43758.5453);\r\n}\r\n\r\nvoid main(void) {\r\n    vec2 px = vec2(1.0 / uTextureSize.x, 1.0 / uTextureSize.y);\r\n    // TODO 自动调节采样次数？\r\n    const float linearSamplingTimes = 7.0;\r\n    const float circleSamplingTimes = 12.0;\r\n    vec4 ownColor = texture2D(uSampler, vTextureCoord);\r\n    vec4 curColor;\r\n    float totalAlpha = 0.0;\r\n    float maxTotalAlpha = 0.0;\r\n    float curDistanceX = 0.0;\r\n    float curDistanceY = 0.0;\r\n    float offsetX = dist * cos(angle) * px.x;\r\n    float offsetY = dist * sin(angle) * px.y;\r\n\r\n    const float PI = 3.14159265358979323846264;\r\n    float cosAngle;\r\n    float sinAngle;\r\n    float offset = PI * 2.0 / circleSamplingTimes * random(vec2(12.9898, 78.233));\r\n    float stepX = blurX * px.x / linearSamplingTimes;\r\n    float stepY = blurY * px.y / linearSamplingTimes;\r\n    for (float a = 0.0; a <= PI * 2.0; a += PI * 2.0 / circleSamplingTimes) {\r\n        cosAngle = cos(a + offset);\r\n        sinAngle = sin(a + offset);\r\n        for (float i = 1.0; i <= linearSamplingTimes; i++) {\r\n            curDistanceX = i * stepX * cosAngle;\r\n            curDistanceY = i * stepY * sinAngle;\r\n            if (vTextureCoord.x + curDistanceX - offsetX >= 0.0 && vTextureCoord.y + curDistanceY + offsetY <= 1.0){\r\n                curColor = texture2D(uSampler, vec2(vTextureCoord.x + curDistanceX - offsetX, vTextureCoord.y + curDistanceY + offsetY));\r\n                totalAlpha += (linearSamplingTimes - i) * curColor.a;\r\n            }\r\n            maxTotalAlpha += (linearSamplingTimes - i);\r\n        }\r\n    }\r\n\r\n    ownColor.a = max(ownColor.a, 0.0001);\r\n    ownColor.rgb = ownColor.rgb / ownColor.a;\r\n\r\n    float outerGlowAlpha = (totalAlpha / maxTotalAlpha) * strength * alpha * (1. - inner) * max(min(hideObject, knockout), 1. - ownColor.a);\r\n    float innerGlowAlpha = ((maxTotalAlpha - totalAlpha) / maxTotalAlpha) * strength * alpha * inner * ownColor.a;\r\n\r\n    ownColor.a = max(ownColor.a * knockout * (1. - hideObject), 0.0001);\r\n    vec3 mix1 = mix(ownColor.rgb, color.rgb, innerGlowAlpha / (innerGlowAlpha + ownColor.a));\r\n    vec3 mix2 = mix(mix1, color.rgb, outerGlowAlpha / (innerGlowAlpha + ownColor.a + outerGlowAlpha));\r\n    float resultAlpha = min(ownColor.a + outerGlowAlpha + innerGlowAlpha, 1.);\r\n    gl_FragColor = vec4(mix2 * resultAlpha, resultAlpha);\r\n}";
            EgretShaderLib.primitive_frag = "precision lowp float;\r\nvarying vec2 vTextureCoord;\r\nvarying vec4 vColor;\r\n\r\nvoid main(void) {\r\n    gl_FragColor = vColor;\r\n}";
            EgretShaderLib.texture_frag = "precision lowp float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform sampler2D uSampler;\n\nvoid main(void) {\n vec4 v4Color = texture2D(uSampler, vTextureCoord) * vColor;\n gl_FragColor = v4Color; \n}";
            EgretShaderLib.texture_sharpen_frag = "#extension GL_OES_standard_derivatives : enable\nprecision lowp float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform sampler2D uSampler;\n\nvoid main(void) {\n vec4 v4Color = texture2D(uSampler, vTextureCoord) * vColor;\n\n vec4 diff = abs(fwidth(v4Color));\n diff = clamp((diff-.1)/(1.0-.1), 0.0, 1.0);\n vec4 edgeColor = -diff*clamp(diff-v4Color,0.0,1.0)*0.5 + diff*clamp(v4Color-diff,0.0,1.0)*1.0; \n edgeColor *= v4Color.a;\n v4Color += vec4(edgeColor.rgb, 0.0);\n\n gl_FragColor = v4Color;\n}";
            EgretShaderLib.texture_alphamask_frag = "precision lowp float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform sampler2D uSampler;\n\nvoid main(void) {\n vec4 v4Color = texture2D(uSampler, vTextureCoord) * vColor;\nif (v4Color.a < 0.0039) { discard; } \n gl_FragColor = v4Color; \n}";
            /*
            "precision lowp float;
            varying vec2 vTextureCoord;
            varying vec4 vColor;
            uniform sampler2D uSampler;
            uniform sampler2D uSamplerAlphaMask;
            void main(void) {
                float alpha = texture2D(uSamplerAlphaMask, vTextureCoord).r;
                if (alpha < 0.0039) { discard; }
                vec4 v4Color = texture2D(uSampler, vTextureCoord);
                v4Color.rgb = v4Color.rgb * alpha;
                v4Color.a = alpha;
                v4Color = v4Color * vColor;
                gl_FragColor = v4Color;
            }"
            */
            EgretShaderLib.texture_etc_alphamask_frag = "precision lowp float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform bool uPremultipliedAlpha;\nuniform sampler2D uSampler;\nuniform sampler2D uSamplerAlphaMask;\nvoid main(void) {\nfloat alpha = texture2D(uSamplerAlphaMask, vTextureCoord).r;\nif (!uPremultipliedAlpha && alpha < 0.0039) { discard; }\nvec4 v4Color = texture2D(uSampler, vTextureCoord);\nv4Color.a = alpha;\nv4Color= v4Color * vColor;\ngl_FragColor = v4Color;\n}";
            EgretShaderLib.texture_vertical_alphamask_frag = "precision lowp float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform bool uPremultipliedAlpha;\nuniform sampler2D uSampler;\nvoid main(void) {\nfloat alpha = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 0.5)).r;\nif (!uPremultipliedAlpha && alpha < 0.0039) { discard; }\nvec4 v4Color = texture2D(uSampler, vTextureCoord);\nv4Color.a = alpha;\nv4Color= v4Color * vColor;\ngl_FragColor = v4Color;\n}";
            EgretShaderLib.texture_horizontal_alphamask_frag = "precision lowp float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform bool uPremultipliedAlpha;\nuniform sampler2D uSampler;\nvoid main(void) {\nfloat alpha = texture2D(uSampler, vec2(vTextureCoord.x + 0.5, vTextureCoord.y)).r;\nif (!uPremultipliedAlpha && alpha < 0.0039) { discard; }\nvec4 v4Color = texture2D(uSampler, vTextureCoord);\nv4Color.a = alpha;\nv4Color= v4Color * vColor;\ngl_FragColor = v4Color;\n}";
            EgretShaderLib.colorTransform_texture_vertical_alphamask_frag = "precision mediump float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform mat4 matrix;\nuniform vec4 colorAdd;\nuniform bool uPremultipliedAlpha;\nuniform sampler2D uSampler;\n\nvoid main(void) {\n float alpha = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 0.5)).r;\nif (!uPremultipliedAlpha && alpha < 0.0039) { discard; }\n   vec4 texColor = texture2D(uSampler, vTextureCoord);\n texColor.a = alpha;\n if(texColor.a > 0.) {\n        // 抵消预乘的alpha通道\n        texColor = vec4(texColor.rgb / texColor.a, texColor.a);\n    }\nvec4 v4Color = clamp(texColor * matrix + colorAdd, 0., 1.);\nv4Color.rgb = v4Color.rgb * alpha;\nv4Color= v4Color * vColor;\ngl_FragColor = v4Color;\n}";
            EgretShaderLib.colorTransform_texture_horizontal_alphamask_frag = "precision mediump float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform mat4 matrix;\nuniform vec4 colorAdd;\nuniform bool uPremultipliedAlpha;\nuniform sampler2D uSampler;\n\nvoid main(void) {\n float alpha = texture2D(uSampler, vec2(vTextureCoord.x + 0.5, vTextureCoord.y)).r;\nif (!uPremultipliedAlpha && alpha < 0.0039) { discard; }\n   vec4 texColor = texture2D(uSampler, vTextureCoord);\n texColor.a = alpha;\n if(texColor.a > 0.) {\n        // 抵消预乘的alpha通道\n        texColor = vec4(texColor.rgb / texColor.a, texColor.a);\n    }\nvec4 v4Color = clamp(texColor * matrix + colorAdd, 0., 1.);\nv4Color.rgb = v4Color.rgb * alpha;\nv4Color= v4Color * vColor;\ngl_FragColor = v4Color;\n}";
            /*
            "precision mediump float;
            varying vec2 vTextureCoord;
            varying vec4 vColor;
            uniform mat4 matrix;
            uniform vec4 colorAdd;
            uniform sampler2D uSampler;
            uniform sampler2D uSamplerAlphaMask;
    
            void main(void){
                float alpha = texture2D(uSamplerAlphaMask, vTextureCoord).r;
                if (alpha < 0.0039) { discard; }
                vec4 texColor = texture2D(uSampler, vTextureCoord);
                if(texColor.a > 0.0) {
                    // 抵消预乘的alpha通道
                    texColor = vec4(texColor.rgb / texColor.a, texColor.a);
                }
                vec4 v4Color = clamp(texColor * matrix + colorAdd, 0.0, 1.0);
                v4Color.rgb = v4Color.rgb * alpha;
                v4Color.a = alpha;
                gl_FragColor = v4Color * vColor;
            }"
            */
            EgretShaderLib.colorTransform_frag_etc_alphamask_frag = "precision mediump float;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nuniform mat4 matrix;\nuniform vec4 colorAdd;\nuniform bool uPremultipliedAlpha;\nuniform sampler2D uSampler;\nuniform sampler2D uSamplerAlphaMask;\n\nvoid main(void){\nfloat alpha = texture2D(uSamplerAlphaMask, vTextureCoord).r;\nif (!uPremultipliedAlpha && alpha < 0.0039) { discard; }\nvec4 texColor = texture2D(uSampler, vTextureCoord);\n texColor.a = alpha;\nif(!uPremultipliedAlpha && texColor.a > 0.0) {\n // 抵消预乘的alpha通道\ntexColor = vec4(texColor.rgb / texColor.a, texColor.a);\n}\nvec4 v4Color = clamp(texColor * matrix + colorAdd, 0.0, 1.0);\nv4Color.rgb = v4Color.rgb * alpha;\ngl_FragColor = v4Color * vColor;\n}";
            // 自己丢去这个链接转义吧：http://www.lzltool.com/string-escape
            EgretShaderLib.tex_uv2_vert = "attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\n\nuniform vec2 projectionVector;\n// uniform vec2 offsetVector;\n\nuniform mat3 sysMat1to2;\n\nvarying vec2 vTextureCoord;\nvarying vec2 vTextureCoord2;\nvarying vec4 vColor;\n\nconst vec2 center = vec2(-1.0, 1.0);\n\nvoid main(void) {\n   gl_Position = vec4( (aVertexPosition / projectionVector) + center , 0.0, 1.0);\n   vTextureCoord = aTextureCoord;\n   vec3 uv2 = vec3(aVertexPosition, 1.0) * sysMat1to2;\n   vTextureCoord2 = uv2.xy;\n   vColor = aColor;\n}";
            EgretShaderLib._tex_uv2_frag = "varying vec2 vTextureCoord;\nvarying vec2 vTextureCoord2;\nvarying vec4 vColor;\nuniform vec3 sysSamplerMaskUVOffset;\nuniform vec4 sysUVClamp;\nuniform bool uPremultipliedAlpha;\nuniform sampler2D uSampler;\nuniform sampler2D uSamplerAlphaMask;\nuniform sampler2D sysSamplerMask;\n\nvoid main(void) {\nfloat alpha = 1.0;\n#if ALPHA_MODE == ALPHA_MODE_SEP\n    alpha = texture2D(uSamplerAlphaMask, vTextureCoord).r;    \n#elif ALPHA_MODE == ALPHA_MODE_VER\n    alpha = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 0.5)).r;\n#elif ALPHA_MODE == ALPHA_MODE_HOR\n    alpha = texture2D(uSampler, vec2(vTextureCoord.x + 0.5, vTextureCoord.y)).r;\n#endif\n\n#if ALPHA_MODE != ALPHA_MODE_NONE\n    if (!uPremultipliedAlpha && alpha < 0.0039) { discard; }\n    vec4 v4Color = texture2D(uSampler, vTextureCoord);\n    v4Color.a = alpha;\n#else \n    vec4 v4Color = texture2D(uSampler, vTextureCoord);\n#endif\n\nv4Color= v4Color * vColor;\nvec2 boundValue = step(sysUVClamp.xy, vTextureCoord2) * step(vTextureCoord2, sysUVClamp.zw);\nvec4 alphaMaskv4 = texture2D(sysSamplerMask, vTextureCoord2+sysSamplerMaskUVOffset.xy) * boundValue.x * boundValue.y;\nfloat alphaMask = dot(alphaMaskv4, vec4(sysSamplerMaskUVOffset.z, 0.0, 0.0, 1.0-sysSamplerMaskUVOffset.z));\n\nv4Color = v4Color * alphaMask;\ngl_FragColor = v4Color;\n}";
            EgretShaderLib.tex_uv2_frag = MACRO_STR_HIGH_FLOAT + "#define ALPHA_MODE ALPHA_MODE_NONE\n" + EgretShaderLib._tex_uv2_frag;
            EgretShaderLib.tex_uv2_sep_alphamask_frag = MACRO_STR_HIGH_FLOAT + "#define ALPHA_MODE ALPHA_MODE_SEP\n" + EgretShaderLib._tex_uv2_frag;
            EgretShaderLib.tex_uv2_vertical_alphamask_frag = MACRO_STR_HIGH_FLOAT + "#define ALPHA_MODE ALPHA_MODE_VER\n" + EgretShaderLib._tex_uv2_frag;
            EgretShaderLib.tex_uv2_horizontal_alphamask_frag = MACRO_STR_HIGH_FLOAT + "#define ALPHA_MODE ALPHA_MODE_HOR\n" + EgretShaderLib._tex_uv2_frag;
            // 自己丢去http://www.lzltool.com/string-escape
            EgretShaderLib.texture_depthmask1_vert = "attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\n\nuniform vec2 projectionVector;\nuniform mat3 sysDetphUVMat0;\n\nvarying vec2 vTextureCoord;\nvarying vec2 vTextureCoordDepth0;\nvarying vec4 vColor;\n\nconst vec2 center = vec2(-1.0, 1.0);\n\nvoid main(void) {\n    gl_Position = vec4( (aVertexPosition / projectionVector) + center , 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n    vec3 uv0 = vec3(aTextureCoord, 1.0) * sysDetphUVMat0;\n    vTextureCoordDepth0 = uv0.xy;\n\n    vColor = aColor;\n}\n";
            EgretShaderLib._texture_depthmask1_frag = "varying vec2 vTextureCoord;\nvarying vec2 vTextureCoordDepth0;\nvarying vec4 vColor;\nuniform vec4 sysDepthUVClamp0;\nuniform sampler2D uSampler;\nuniform sampler2D uSamplerAlphaMask;\nuniform sampler2D sysSamplerDepth0;\n\nvoid main(void) {\n    vec4 v4Color = texture2D(uSampler, vTextureCoord);\n#if ALPHA_MODE == ALPHA_MODE_SEP\n    float alpha = texture2D(uSamplerAlphaMask, vTextureCoord).r;\n#elif ALPHA_MODE == ALPHA_MODE_VER\n    float alpha = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 0.5)).r;\n#elif ALPHA_MODE == ALPHA_MODE_HOR\n    float alpha = texture2D(uSampler, vec2(vTextureCoord.x + 0.5, vTextureCoord.y)).r;\n#else\n    float alpha = v4Color.a;\n#endif\n    v4Color.a = alpha;\n\n    vec4 shadowThreshold = vec4(0.03, 0.03, 0.03, 0.71);\n    vec4 shadowFactV4 = step(v4Color, shadowThreshold);\n    float isShadow = shadowFactV4.x * shadowFactV4.y * shadowFactV4.z * shadowFactV4.w;\n\n    vec4 alphaColor = texture2D(sysSamplerDepth0, vTextureCoordDepth0);\n    \n    float edgeSmooth = 0.005;\n    vec2 boundInner = smoothstep(sysDepthUVClamp0.xy, sysDepthUVClamp0.xy + edgeSmooth, vTextureCoordDepth0);\n    vec2 boundOuter = smoothstep(sysDepthUVClamp0.zw - edgeSmooth, sysDepthUVClamp0.zw, vTextureCoordDepth0);\n    float boundValue = boundInner.x * boundInner.y * (1.0 - boundOuter.x) * (1.0 - boundOuter.y);\n    \n    float alpha_body = min(1.0, alphaColor.x + (1.0 - boundValue));\n    float alpha_shadow = max(1.0-alphaColor.z*boundValue/v4Color.a, 1.0-isShadow);\n    float alphaFix = alpha_body * alpha_shadow;\n\n    v4Color = v4Color * alphaFix * vColor;\n    gl_FragColor = v4Color; \n}";
            EgretShaderLib.texture_depthmask1_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_NONE\n" + EgretShaderLib._texture_depthmask1_frag;
            EgretShaderLib.texture_depthmask1_sep_alphamask_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_SEP\n" + EgretShaderLib._texture_depthmask1_frag;
            EgretShaderLib.texture_depthmask1_vertical_alphamask_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_VER\n" + EgretShaderLib._texture_depthmask1_frag;
            EgretShaderLib.texture_depthmask1_horizontal_alphamask_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_HOR\n" + EgretShaderLib._texture_depthmask1_frag;
            EgretShaderLib.texture_depthmask2_vert = "attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\n\nuniform vec2 projectionVector;\nuniform mat3 sysDetphUVMat0;\nuniform mat3 sysDetphUVMat1;\n\nvarying vec2 vTextureCoord;\nvarying vec2 vTextureCoordDepth0;\nvarying vec2 vTextureCoordDepth1;\nvarying vec4 vColor;\n\nconst vec2 center = vec2(-1.0, 1.0);\n\nvoid main(void) {\n    gl_Position = vec4( (aVertexPosition / projectionVector) + center , 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n    vec3 uv0 = vec3(aTextureCoord, 1.0) * sysDetphUVMat0;\n    vTextureCoordDepth0 = uv0.xy;\n\n    vec3 uv1 = vec3(aTextureCoord, 1.0) * sysDetphUVMat1;\n    vTextureCoordDepth1 = uv1.xy;\n\n    vColor = aColor;\n}\n";
            EgretShaderLib._texture_depthmask2_frag = "varying vec2 vTextureCoord;\nvarying vec2 vTextureCoordDepth0;\nvarying vec2 vTextureCoordDepth1;\nvarying vec4 vColor;\nuniform vec4 sysDepthUVClamp0;\nuniform vec4 sysDepthUVClamp1;\nuniform sampler2D uSampler;\nuniform sampler2D uSamplerAlphaMask;\nuniform sampler2D sysSamplerDepth0;\nuniform sampler2D sysSamplerDepth1;\n\nvoid main(void) {\n    vec4 v4Color = texture2D(uSampler, vTextureCoord);\n#if ALPHA_MODE == ALPHA_MODE_SEP\n    float alpha = texture2D(uSamplerAlphaMask, vTextureCoord).r;\n#elif ALPHA_MODE == ALPHA_MODE_HOR\n    float alpha = texture2D(uSampler, vec2(vTextureCoord.x + 0.5, vTextureCoord.y)).r;\n#elif ALPHA_MODE == ALPHA_MODE_VER\n    float alpha = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 0.5)).r;\n#else\n    float alpha = v4Color.a;\n#endif\n    if(alpha < 0.01) { discard; }    \n    v4Color.a = alpha;\n    vec4 depthColor = texture2D(sysSamplerDepth0, vTextureCoordDepth0);\n    vec4 depth1Color = texture2D(sysSamplerDepth1, vTextureCoordDepth1.xy);\n    \n    vec2 boundValue0 = step(sysDepthUVClamp0.xy, vTextureCoordDepth0) * step(vTextureCoordDepth0, sysDepthUVClamp0.zw);\n    vec2 boundValue1 = step(sysDepthUVClamp1.xy, vTextureCoordDepth1.xy) * step(vTextureCoordDepth1.xy, sysDepthUVClamp1.zw);\n\n    float depth = depthColor.x*boundValue0.x*boundValue0.y;\n    vec2 depth1 = depth1Color.xz*boundValue1.x*boundValue1.y;\n    float alphaFix = 1.0 - depth1.y+depth1.y*step(depth1.x,depth);\n\n    vec4 shadowFactV4 = step(v4Color, vec4(0.03, 0.03, 0.03, 0.71));\n    float isShadow = shadowFactV4.x * shadowFactV4.y * shadowFactV4.z * shadowFactV4.w;\n    float shadowAlphaFix = max(1.0 - depth1.y/alpha, 1.0-isShadow);\n\n    v4Color = v4Color * alphaFix * vColor * shadowAlphaFix;\n    gl_FragColor = v4Color; \n}";
            EgretShaderLib.texture_depthmask2_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_NONE\n" + EgretShaderLib._texture_depthmask2_frag;
            EgretShaderLib.texture_depthmask2_sep_alphamask_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_SEP\n" + EgretShaderLib._texture_depthmask2_frag;
            EgretShaderLib.texture_depthmask2_vertical_alphamask_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_VER\n" + EgretShaderLib._texture_depthmask2_frag;
            EgretShaderLib.texture_depthmask2_horizontal_alphamask_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_HOR\n" + EgretShaderLib._texture_depthmask2_frag;
            EgretShaderLib.texture_depthmask3_vert = "attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\n\nuniform vec2 projectionVector;\nuniform mat3 sysDetphUVMat0;\nuniform mat3 sysDetphUVMat1;\nuniform mat3 sysDetphUVMat2;\n\nvarying vec2 vTextureCoord;\nvarying vec2 vTextureCoordDepth0;\nvarying vec4 vTextureCoordDepth12;\nvarying vec4 vColor;\n\nconst vec2 center = vec2(-1.0, 1.0);\n\nvoid main(void) {\n    gl_Position = vec4( (aVertexPosition / projectionVector) + center , 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n    vec3 uv0 = vec3(aTextureCoord, 1.0) * sysDetphUVMat0;\n    vTextureCoordDepth0 = uv0.xy;\n\n    vec3 uv1 = vec3(aTextureCoord, 1.0) * sysDetphUVMat1;\n    vec3 uv2 = vec3(aTextureCoord, 1.0) * sysDetphUVMat2;\n\n    vTextureCoordDepth12 = vec4(uv1.xy, uv2.xy);\n    vColor = aColor;\n}";
            EgretShaderLib._texture_depthmask3_frag = "varying vec2 vTextureCoord;\nvarying vec2 vTextureCoordDepth0;\nvarying vec4 vTextureCoordDepth12;\nvarying vec4 vColor;\nuniform vec4 sysDepthUVClamp0;\nuniform vec4 sysDepthUVClamp1;\nuniform vec4 sysDepthUVClamp2;\nuniform sampler2D uSampler;\nuniform sampler2D uSamplerAlphaMask;\nuniform sampler2D sysSamplerDepth0;\nuniform sampler2D sysSamplerDepth1;\nuniform sampler2D sysSamplerDepth2;\n\nvoid main(void) {\n    vec4 v4Color = texture2D(uSampler, vTextureCoord);\n#if ALPHA_MODE == ALPHA_MODE_SEP\n    float alpha = texture2D(uSamplerAlphaMask, vTextureCoord).r;\n#elif ALPHA_MODE == ALPHA_MODE_HOR\n    float alpha = texture2D(uSampler, vec2(vTextureCoord.x + 0.5, vTextureCoord.y)).r;\n#elif ALPHA_MODE == ALPHA_MODE_VER\n    float alpha = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 0.5)).r;\n#else\n    float alpha = v4Color.a;\n#endif\n    if(alpha < 0.01) { discard; }    \n    v4Color.a = alpha;\n    vec4 depthColor = texture2D(sysSamplerDepth0, vTextureCoordDepth0);\n    vec4 depth1Color = texture2D(sysSamplerDepth1, vTextureCoordDepth12.xy);\n    vec4 depth2Color = texture2D(sysSamplerDepth2, vTextureCoordDepth12.zw);\n\n    vec2 boundValue0 = step(sysDepthUVClamp0.xy, vTextureCoordDepth0) * step(vTextureCoordDepth0, sysDepthUVClamp0.zw);\n    vec4 boundValue12 = step(vec4(sysDepthUVClamp1.xy, sysDepthUVClamp2.xy), vTextureCoordDepth12) * step(vTextureCoordDepth12, vec4(sysDepthUVClamp1.zw, sysDepthUVClamp2.zw));\n\n    float depth = depthColor.x*boundValue0.x*boundValue0.y;\n    vec2 depth1 = depth1Color.xz*boundValue12.x*boundValue12.y;\n    vec2 depth2 = depth2Color.xz*boundValue12.z*boundValue12.w;\n\n    float alphaFix = 1.0 - max(depth1.y-depth1.y*step(depth1.x,depth), depth2.y-depth2.y*step(depth2.x,depth));\n\n    vec4 shadowFactV4 = step(v4Color, vec4(0.03, 0.03, 0.03, 0.71));\n    float isShadow = shadowFactV4.x * shadowFactV4.y * shadowFactV4.z * shadowFactV4.w;\n    float shadowAlphaFix = max(1.0 - max(depth1.y, depth2.y)/alpha, 1.0-isShadow);\n\n    v4Color = v4Color * alphaFix * vColor * shadowAlphaFix;\n    gl_FragColor = v4Color; \n}";
            EgretShaderLib.texture_depthmask3_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_NONE\n" + EgretShaderLib._texture_depthmask3_frag;
            EgretShaderLib.texture_depthmask3_sep_alphamask_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_SEP\n" + EgretShaderLib._texture_depthmask3_frag;
            EgretShaderLib.texture_depthmask3_vertical_alphamask_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_VER\n" + EgretShaderLib._texture_depthmask3_frag;
            EgretShaderLib.texture_depthmask3_horizontal_alphamask_frag = MACRO_STR_LOW_FLOAT + "#define ALPHA_MODE ALPHA_MODE_HOR\n" + EgretShaderLib._texture_depthmask3_frag;
            EgretShaderLib.sdf_rect_frag = "precision lowp float;\r\n" +
                "uniform vec4 vColor;\r\n" +
                "\r\n" +
                "void main(void) {\r\n" +
                "    gl_FragColor = vColor;\r\n" +
                "}";
            return EgretShaderLib;
        }());
        web.EgretShaderLib = EgretShaderLib;
        __reflect(EgretShaderLib.prototype, "egret.web.EgretShaderLib");
    })(web = egret.web || (egret.web = {}));
})(egret || (egret = {}));
;
