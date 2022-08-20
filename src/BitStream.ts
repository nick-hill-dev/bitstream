class BitStream {

    public bits: number[] = [];

    public position: number = 0;

    public static fromString(value: string): BitStream {
        let result = new BitStream();
        let decoded = atob(value);
        for (let i = 0; i < decoded.length; i++) {
            let bits = decoded.charCodeAt(i).toString(2);
            for (let i = 0; i < 8 - bits.length; i++) {
                result.bits.push(0);
            }
            for (let j = 0; j < bits.length; j++) {
                result.bits.push(parseInt(bits[j]));
            }
        }
        return result;
    }

    public readBoolean(): boolean {
        return this.bits[this.position++] == 1;
    }

    public readHalfNibble(): number {
        return this.readUInt(2);
    }

    public readNibble(): number {
        return this.readUInt(4);
    }

    public readByte(): number {
        return this.readUInt(8);
    }

    public readUInt16(): number {
        return this.readUInt(16);
    }

    public readUInt32(): number {
        return this.readUInt(32);
    }

    public readUInt64(): number {
        return this.readUInt(64);
    }

    public readUIntMixed(minBits: number, maxBits: number, mode: 'prefixBit' | 'optimistic' = 'prefixBit'): number {
        if (mode == 'prefixBit') {
            if (!this.readBoolean()) {
                return this.readUInt(minBits)
            }
            return this.readUInt(maxBits);
        } else {
            let value = this.readUInt(minBits);
            if (value == Math.pow(2, minBits) - 1) {
                value = this.readUInt(maxBits);
            }
            return value;
        }
    }

    public readMixedByteOrUInt16(mode: 'prefixBit' | 'optimistic' = 'prefixBit'): number {
        return this.readUIntMixed(8, 16, mode);
    }

    public readMixedUInt16OrUInt32(mode: 'prefixBit' | 'optimistic' = 'prefixBit'): number {
        return this.readUIntMixed(16, 32, mode);
    }

    public readUInt(bitCount: number): number {
        let result = 0;
        while (bitCount > 0) {
            bitCount--;
            result += this.bits[this.position++] << bitCount;
        }
        return result;
    }

    public readString(minLengthBits: number = 8, maxLengthBits: number = 32, mode: 'standard' | 'optimizeFor7Bits' = 'standard'): string {
        let n = Math.pow(2, minLengthBits) - 1;
        let length = this.readUInt(minLengthBits);
        if (length === n) {
            length = this.readUInt(maxLengthBits);
        }
        let result = '';
        for (let i = 0; i < length; i++) {
            let code = 0;
            if (mode === 'standard') {
                code = this.readByte();
                if (code === 255) {
                    code = this.readUInt32();
                }
            } else {
                code = this.readUInt(7);
                if (code === 127) {
                    code = this.readUInt32();
                }
            }
            result += String.fromCharCode(code);
        }
        return result;
    }

    public writeBoolean(value: boolean) {
        this.bits.push(value ? 1 : 0);
    }

    public writeHalfNibble(value: number) {
        this.writeUInt(value, 2);
    }

    public writeNibble(value: number) {
        this.writeUInt(value, 4);
    }

    public writeByte(value: number) {
        this.writeUInt(value, 8);
    }

    public writeUInt16(value: number) {
        this.writeUInt(value, 16);
    }

    public writeUInt32(value: number) {
        this.writeUInt(value, 32);
    }

    public writeUInt64(value: number) {
        this.writeUInt(value, 64);
    }

    public writeUIntMixed(value: number, minBits: number, maxBits: number, mode: 'prefixBit' | 'optimistic' = 'prefixBit') {
        let maxValue = Math.pow(2, minBits) - 1;
        if (mode == 'prefixBit') {
            if (value <= maxValue) {
                this.writeBoolean(false);
                this.writeUInt(value, minBits);
            } else {
                this.writeBoolean(true);
                this.writeUInt(value, maxBits);
            }
        } else {
            if (value < maxValue) {
                this.writeUInt(value, minBits);
            } else {
                this.writeUInt(maxValue, minBits);
                this.writeUInt(value, maxBits);
            }
        }
    }

    public writeMixedByteOrUInt16(value: number, mode: 'prefixBit' | 'optimistic' = 'prefixBit') {
        this.writeUIntMixed(value, 8, 16, mode);
    }

    public writeMixedUInt16OrUInt32(value: number, mode: 'prefixBit' | 'optimistic' = 'prefixBit') {
        this.writeUIntMixed(value, 16, 32, mode);
    }

    public writeUInt(value: number, bitCount: number) {
        let bits = BitStream.convertUInt64ToBits(value);
        for (let i = 0; i < bitCount; i++) {
            this.bits.push(bits[64 - bitCount + i]);
        }
    }

    public writeString(value: string, minLengthBits: number = 8, maxLengthBits: number = 32, mode: 'standard' | 'optimizeFor7Bits' = 'standard') {
        let n = Math.pow(2, minLengthBits) - 1;
        if (value.length < n) {
            this.writeUInt(value.length, minLengthBits);
        } else {
            this.writeUInt(n, minLengthBits);
            this.writeUInt(value.length, maxLengthBits);
        }
        for (let i = 0; i < value.length; i++) {
            let n = value.charCodeAt(i);
            if (mode === 'standard') {
                if (n < 255) {
                    this.writeByte(n);
                } else {
                    this.writeByte(255);
                    this.writeUInt32(n);
                }
            } else {
                if (n < 127) {
                    this.writeUInt(n, 7);
                } else {
                    this.writeUInt(127, 7);
                    this.writeUInt32(n);
                }
            }
        }
    }

    public toByteArray(): Uint8Array {
        let result = new Uint8Array(Math.ceil(this.bits.length / 8));
        for (let i = 0; i < this.bits.length; i++) {
            let index = Math.floor(i / 8);
            let shift = 7 - (i % 8);
            result[index] += (this.bits[i] ? 1 : 0) << shift;
        }
        return result;
    }

    public toString(): string {
        let binary = '';
        let bytes = this.toByteArray();
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private static convertUInt64ToBits(value: number): number[] {
        let result: number[] = [];
        let bits = value.toString(2);
        for (let i = 0; i < 64 - bits.length; i++) {
            result.push(0);
        }
        for (let bit of bits) {
            result.push(parseInt(bit));
        }
        return result;
    }

}