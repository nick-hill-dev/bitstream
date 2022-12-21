class HuffmanNode {

    public constructor(
        public value: string,
        public size: number,
        public left: HuffmanNode = undefined,
        public right: HuffmanNode = undefined,
    ) {
    }

    public getCompressedRepresentation(): BitStream {
        let result = new BitStream();
        this.enum(node => {
            if (node.value) {
                result.writeBoolean(true);
                result.writeByte(node.value.charCodeAt(0));
            } else {
                result.writeBoolean(false);
            }
        });
        return result;
    }

    public createLookupTable(): HuffmanLookupTable {
        
        let result: HuffmanLookupTable = {};
        if (!this.left && !this.right && this.value) {
            result[this.value] = [false];
            return result;
        }

        this.enumForBits([], (node, bits) => {
            if (node.value) {
                result[node.value] = bits;
            }
        });
        return result;
    }

    private enumForBits(bits: boolean[], f: (node: HuffmanNode, bits: boolean[]) => void) {
        if (this.left) {
            let newBits = [...bits, false];
            this.left.enumForBits(newBits, f);
        }
        f(this, bits);
        if (this.right) {
            let newBits = [...bits, true];
            this.right.enumForBits(newBits, f);
        }
    }

    private enum(f: (node: HuffmanNode) => void) {
        if (this.left) {
            this.left.enum(f);
        }
        f(this);
        if (this.right) {
            this.right.enum(f);
        }
    }

}