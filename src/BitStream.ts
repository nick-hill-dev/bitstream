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

    public readMixedByteOrUInt16(mode: 'prefixBit' | 'optimistic' = 'prefixBit'): number {
        if (mode == 'prefixBit') {
            if (!this.readBoolean()) {
                return this.readByte();
            }
            return this.readUInt16();
        } else {
            let value = this.readByte();
            if (value == 255) {
                value = this.readUInt16();
            }
            return value;
        }
    }

    public readMixedUInt16OrUInt32(mode: 'prefixBit' | 'optimistic' = 'prefixBit'): number {
        if (mode == 'prefixBit') {
            if (!this.readBoolean()) {
                return this.readUInt16();
            }
            return this.readUInt32();
        } else {
            let value = this.readUInt16();
            if (value == 65535) {
                value = this.readUInt32();
            }
            return value;
        }
    }

    public readUInt(bitCount: number): number {
        let result = 0;
        while (bitCount > 0) {
            bitCount--;
            result += this.bits[this.position++] << bitCount;
        }
        return result;
    }

    public readString(mode: 'standard' | 'optimizeFor7Bits' = 'standard'): string {
        let length = this.readByte();
        if (length === 255) {
            length = this.readUInt32();
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

    public writeMixedByteOrUInt16(value: number, mode: 'prefixBit' | 'optimistic' = 'prefixBit') {
        if (mode == 'prefixBit') {
            if (value <= 255) {
                this.writeBoolean(false);
                this.writeByte(value);
            } else {
                this.writeBoolean(true);
                this.writeUInt16(value);
            }
        } else {
            if (value < 255) {
                this.writeByte(value);
            } else {
                this.writeByte(255);
                this.writeUInt16(value);
            }
        }
    }

    public writeMixedUInt16OrUInt32(value: number, mode: 'prefixBit' | 'optimistic' = 'prefixBit') {
        if (mode == 'prefixBit') {
            if (value <= 65535) {
                this.writeBoolean(false);
                this.writeUInt16(value);
            } else {
                this.writeBoolean(true);
                this.writeUInt32(value);
            }
        } else {
            if (value < 65535) {
                this.writeUInt16(value);
            } else {
                this.writeUInt16(65535);
                this.writeUInt32(value);
            }
        }
    }

    public writeUInt(value: number, bitCount: number) {
        let bits = BitStream.convertUInt64ToBits(value);
        for (let i = 0; i < bitCount; i++) {
            this.bits.push(bits[64 - bitCount + i]);
        }
    }

    public writeString(value: string, mode: 'standard' | 'optimizeFor7Bits' = 'standard') {
        if (value.length < 255) {
            this.writeByte(value.length);
        } else {
            this.writeByte(255);
            this.writeUInt32(value.length);
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