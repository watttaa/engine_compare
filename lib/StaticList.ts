

export class StaticList {
    private $maxSize: number;
    private $list: any[];
    public constructor(maxSize: number) {
        this.$maxSize = maxSize;
        this.$list = new Array();
    }

    public add(data) {
        if (this.$list.length === this.$maxSize) {
            this.$list.shift();
        }
        this.$list.push(data);
    }

    public get list() {
        return this.$list;
    }
    public get size() {
        return this.$maxSize;
    }
    public set size(maxSize: number) {
        this.$maxSize = maxSize;
    }

}