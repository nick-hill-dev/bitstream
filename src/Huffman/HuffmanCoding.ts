class HuffmanCoding {

    public static createGraphFor(values: string | string[]): HuffmanNode {
        let graph: HuffmanNode[] = [];
        for (let value of values) {
            let entry = graph.find(n => n.value === value);
            if (!entry) {
                entry = new HuffmanNode(value, 0);
                graph.push(entry);
            }
            entry.size++;
        }

        while (graph.length > 1) {
            graph.sort((a, b) => b.size - a.size);
            let left = graph[graph.length - 2];
            let right = graph[graph.length - 1];
            graph[graph.length - 2] = new HuffmanNode(undefined, left.size + right.size, left, right);
            graph.pop();
        }

        return graph[0] ?? new HuffmanNode('', 0, null, null);
    }

    public static encode(text: string, table: HuffmanLookupTable): HuffmanCodingResponse {
        let bits = new BitStream();
        for (let c of text) {
            let representation = table[c];
            for (let bitToWrite of representation) {
                bits.writeBoolean(bitToWrite);
            }
        }
        return new HuffmanCodingResponse(bits, text.length);
    }

    public static decode(reader: BitStream, length: number, graph: HuffmanNode): string {

        // Edge case for a graph with only one possible character
        let result = '';
        let startPosition = reader.position;
        if (!graph.left && !graph.right) {
            for (let i = 0; i < length; i++) {
                result += graph.value;
                reader.readBoolean();
            }
        }

        // More than one possible character
        while (reader.position < startPosition + length) {
            let node = graph;
            while (node) {
                if (!node.left && !node.right) {
                    result += node.value;
                    node = null;
                } else {
                    node = reader.readBoolean() ? node.right : node.left;
                }
            }
        }
        return result;
    }

}