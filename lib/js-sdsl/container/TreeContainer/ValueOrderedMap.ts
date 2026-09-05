import { Container, initContainer } from '../../container/ContainerBase';
import {OrderedSet, OrderedSetIterator } from './OrderedSet';

// class ValueOrderedMapIterator<K, V> extends TreeIterator<K, V> {
//   container: ValueOrderedMap<K, V>;
//   constructor(
//     node: TreeNode<K, V>,
//     header: TreeNode<K, V>,
//     container: ValueOrderedMap<K, V>,
//     iteratorType?: IteratorType
//   ) {
//     super(node, header, iteratorType);
//     this.container = container;
//   }
//   get pointer() {
//     if (this._node === this._header) {
//       throwIteratorAccessError();
//     }
//     const self = this;
//     return new Proxy(<[K, V]><unknown>[], {
//       get(target, prop: '0' | '1') {
//         if (prop === '0') return self._node._key!;
//         else if (prop === '1') return self._node._value!;
//         target[0] = self._node._key!;
//         target[1] = self._node._value!;
//         return target[prop];
//       },
//       set(_, prop: '1', newValue: V) {
//         if (prop !== '1') {
//           throw new TypeError('prop must be 1');
//         }
//         self._node._value = newValue;
//         return true;
//       }
//     });
//   }
//   copy() {
//     return new ValueOrderedMapIterator<K, V>(
//       this._node,
//       this._header,
//       this.container,
//       this.iteratorType
//     );
//   }
//   // @ts-ignore
//   equals(iter: ValueOrderedMapIterator<K, V>): boolean;
// }

// export type { ValueOrderedMapIterator };
export type ValueOrderedMapIterator<K, V> = OrderedSetIterator<K>
// type CmpType<V> = (x: V, y: V) => number
type CmpType<K, V> = (k1: K, v1: V, k2: K, v2: V) => number
export class ValueOrderedMap<K, V> extends Container<K | [K, V]> {
  /**
   * @internal
   */
  protected readonly _cmp: CmpType<K, V>;
  protected readonly _map = new Map<K, V>()
  protected readonly _ordered_set: OrderedSet<K>;
  /**
   * @param container - The initialization container.
   * @param cmp - The compare function.
   * @param enableIndex - Whether to enable iterator indexing function.
   * @example
   * new ValueOrderedMap();
   * new ValueOrderedMap([[0, 1], [2, 1]]);
   * new ValueOrderedMap([[0, 1], [2, 1]], (x, y) => x - y);
   * new ValueOrderedMap([[0, 1], [2, 1]], (x, y) => x - y, true);
   */
  constructor(
    container: initContainer<[K, V]> = [],
    cmp?: CmpType<K, V>,
    enableIndex?: boolean
  ) {
    super()
    this._cmp = cmp ? cmp : (k1, v1, k2, v2) => {
      if (v1 < v2) return -1;
      if (v1 > v2) return 1;
      if (k1 < k2) return -1;
      if (k1 > k2) return 1;
      return 0;
    };
    this._ordered_set = new OrderedSet<K>([], (x, y) => {
      const vx = this._map.get(x);
      const vy = this._map.get(y);
      return this._cmp(x, vx!, y, vy!);
    }, enableIndex);
    const self = this;
    container.forEach(function (el) {
      self.setElement(el[0], el[1]);
    });
  }
  clear() {
    this._map.clear()
    this._ordered_set.clear()
  }
  begin() {
    return this._ordered_set.begin();
    // return new ValueOrderedMapIterator<K, V>(this._header._left || this._header, this._header, this);
  }
  end() {
    return this._ordered_set.end();
    // return new ValueOrderedMapIterator<K, V>(this._header, this._header, this);
  }
  rBegin() {
    return this._ordered_set.rBegin();
    // return new ValueOrderedMapIterator<K, V>(
    //   this._header._right || this._header,
    //   this._header,
    //   this,
    //   IteratorType.REVERSE
    // );
  }
  rEnd() {
    return this._ordered_set.rEnd();
    // return new ValueOrderedMapIterator<K, V>(this._header, this._header, this, IteratorType.REVERSE);
  }
  front() {
    const k = this._ordered_set.front();
    if (k === undefined){
      return undefined
    }
    const v = this._map.get(k);
    return <[K, V]>[k, v]
  }
  back() {
    const k = this._ordered_set.back();
    if (k === undefined){
      return undefined
    }
    const v = this._map.get(k);
    return <[K, V]>[k, v]
    // if (this._length === 0) return;
    // const maxNode = this._header._right!;
    // return <[K, V]>[maxNode._key, maxNode._value];
  }
  // lowerBound(key: K) {
  //   const resNode = this._lowerBound(this._root, key);
  //   return new ValueOrderedMapIterator<K, V>(resNode, this._header, this);
  // }
  // upperBound(key: K) {
  //   const resNode = this._upperBound(this._root, key);
  //   return new ValueOrderedMapIterator<K, V>(resNode, this._header, this);
  // }
  // reverseLowerBound(key: K) {
  //   const resNode = this._reverseLowerBound(this._root, key);
  //   return new ValueOrderedMapIterator<K, V>(resNode, this._header, this);
  // }
  // reverseUpperBound(key: K) {
  //   const resNode = this._reverseUpperBound(this._root, key);
  //   return new ValueOrderedMapIterator<K, V>(resNode, this._header, this);
  // }
  forEach(callback: (element: [K, V], index: number, map: ValueOrderedMap<K, V>) => void) {
    return this._ordered_set.forEach((k, index, set) => {
      const v = this._map.get(k)
      callback([k, v!], index, this)
    })
    // this._inOrderTraversal(function (node, index, map) {
    //   callback(<[K, V]>[node._key, node._value], index, map);
    // });
  }
  /**
   * @description Insert a key-value pair or set value by the given key.
   * @param key - The key want to insert.
   * @param value - The value want to set.
   * @param hint - You can give an iterator hint to improve insertion efficiency.
   * @return The size of container after setting.
   * @example
   * const mp = new ValueOrderedMap([[2, 0], [4, 0], [5, 0]]);
   * const iter = mp.begin();
   * mp.setElement(1, 0);
   * mp.setElement(3, 0, iter);  // give a hint will be faster.
   */
  setElement(key: K, value: V) {
    // console.log("set", key, value)
    // console.log("end", this._ordered_set.end())
    // console.log("eq1", exitst_it.equals(this._ordered_set.end()))
    // console.log("eq2", exitst_it == this._ordered_set.end())
    if (this._map.has(key)) {
      // 找到了，先删除
      this.eraseElementByKey(key)
      // console.log("set erase", key, value)
    }
    // 需要先设置到map再操作
    this._map.set(key, value)
    this._ordered_set.insert(key)
    // console.log("set insert", key, value)
    return this.length
  }
  getElementByPos(pos: number) {
    return this._ordered_set.getElementByPos(pos)
  }
  find(key: K) {
    return this._ordered_set.find(key)
  }
  /**
   * @description Get the value of the element of the specified key.
   * @param key - The specified key you want to get.
   * @example
   * const val = container.getElementByKey(1);
   */
  getElementByKey(key: K) {
    return this._map.get(key)
  }
  union(other: ValueOrderedMap<K, V>) {
    const self = this;
    other.forEach(function (el) {
      self.setElement(el[0], el[1]);
    });
    return this._ordered_set.length;
  }
  *[Symbol.iterator]() {
    const g = this._map.get
    for (const k of this._ordered_set) {
      const v = g(k);
      yield <[K, V]>[k, v]
    }
    // const length = this._length;
    // const nodeList = this._inOrderTraversal();
    // for (let i = 0; i < length; ++i) {
    //   const node = nodeList[i];
    //   yield <[K, V]>[node._key, node._value];
    // }
  }
  /**
   * @description Remove the element of the specified key.
   * @param key - The key you want to remove.
   * @returns Whether erase successfully.
   */
  eraseElementByKey(key: K) {
    const result = this._ordered_set.eraseElementByKey(key)
    this._map.delete(key)
    return result
  }
  get length() {
    return this._ordered_set.length
  }
  size(): number {
    return this._ordered_set.length
  }
  eraseElementByPos(pos: number): number {
    const k = this._ordered_set.getElementByPos(pos)
    this.eraseElementByKey(k)
    return this.length
  }
  getHeight() {
    return this._ordered_set.getHeight()
  }
  // @ts-ignore
  eraseElementByIterator(iter: ValueOrderedMapIterator<K, V>): ValueOrderedMapIterator<K, V>;
}
