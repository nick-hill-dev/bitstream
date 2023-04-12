class BitStream {

    public bits: number[] = [];

    public position: number = 0;

    /**
     * Transforms a base-64 string into a bit stream, typically so that binary data can be read from it.
     */
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

    /** Returns the next bit in the bit stream as a boolean value. */
    public readBoolean(): boolean {
        return this.bits[this.position++] === 1;
    }

    /** Returns the next two bits in the bit stream as an unsigned half-nibble value (a value between 0 and 3 inclusive). */
    public readHalfNibble(): number {
        return this.readUInt(2);
    }

    /** Returns the next four bits in the bit stream as an unsigned nibble value (a value between 0 and 15 inclusive). */
    public readNibble(): number {
        return this.readUInt(4);
    }

    /** Returns the next eight bits in the bit stream as an unsigned byte value (a value between 0 and 255 inclusive). */
    public readByte(): number {
        return this.readUInt(8);
    }

    /** Returns the next 16 bits in the bit stream as an unsigned 16-bit integer (a value between 0 and 65,535 inclusive). */
    public readUInt16(): number {
        return this.readUInt(16);
    }

    /** Returns the next 32 bits in the bit stream as an unsigned 32-bit integer (a value between 0 and 4,294,967,295 inclusive). */
    public readUInt32(): number {
        return this.readUInt(32);
    }

    /** Returns the next 64 bits in the bit stream as an unsigned 64-bit integer. */
    public readUInt64(): number {
        return this.readUInt(64);
    }

    /**
     * Reads an unsigned integer value from the bit stream based on the specified bit length and mode.
     * Used to return information that was stored as densely as possible with a small number of bits via `writeUIntMixed`,
     * while supporting the possibility that the number of bits was insufficient to store the number
     * (and therfore a larger number of bits was necessary).
     *
     * @param minBits - The minimum number of bits to read.
     * @param maxBits - The maximum number of bits to read, in addition to `minBits`, if it turns out more bits were required to store the number.
     * @param mode - The mode that was originally used to store the value.
     *   - 'prefixBit': Reads a prefix bit that determines whether to read and return `minBits` or `maxBits`.
     *   - 'optimistic': Reads `minBits` and returns that value, but if the value is the maximum possible for `minBits`, additionally reads `maxBits` and returns that value instead.
     * 
     * @see `writeUIntMixed` For writing these values.
     */
    public readUIntMixed(minBits: number, maxBits: number, mode: 'prefixBit' | 'optimistic' = 'prefixBit'): number {
        if (mode === 'prefixBit') {
            if (!this.readBoolean()) {
                return this.readUInt(minBits)
            }
            return this.readUInt(maxBits);
        } else {
            let value = this.readUInt(minBits);
            if (value === Math.pow(2, minBits) - 1) {
                value = this.readUInt(maxBits);
            }
            return value;
        }
    }

    /**
     * Reads 8 - 24 bits of information to retrieve a value between 0 and 65,535 inclusive.
     * - For `prefixBit` typically 9 bits are read but if the value was too large 17 bits are read instead.
     * - For `optimistic` typically 8 bits are read but if the value was too large an additional 16 bits are read (total 24 bits).
     * 
     * @see `readUIntMixed` For how the `mode` parameter directs how the information is read.
     */
    public readMixedByteOrUInt16(mode: 'prefixBit' | 'optimistic' = 'prefixBit'): number {
        return this.readUIntMixed(8, 16, mode);
    }

    /**
     * Reads 16 - 48 bits of information to retrieve a value between 0 and 4,294,967,295 inclusive.
     * - For `prefixBit` typically 17 bits are read but if the value was too large 33 bits are read instead.
     * - For `optimistic` typically 16 bits are read but if the value was too large an additional 32 bits are read (total 48 bits).
     * 
     * @see `readUIntMixed` For how the `mode` parameter directs how the information is read.
     */
    public readMixedUInt16OrUInt32(mode: 'prefixBit' | 'optimistic' = 'prefixBit'): number {
        return this.readUIntMixed(16, 32, mode);
    }

    /** Reads `bitCount` number of bits from the bit stream and returns the number represented by those bits. */
    public readUInt(bitCount: number): number {
        let result = 0;
        while (bitCount > 0) {
            bitCount--;
            if (this.bits[this.position++]) {
                result += Math.pow(2, bitCount);
            }
        }
        return result;
    }

    /**
     * Reads a string from the bit stream based on the specified characteristics of how it was stored in the bit stream.
     * Strings in bit streams are stored with a length prefix and each character is expected to typically occupy 7 or 8 bits of storage.
     * 
     * @param minLengthBits The minimum number of bits to read to know how long the string is. Strings equal to or longer than this length use `minLengthBits` + `maxLengthBits` instead.
     * @param maxLengthBits The maximum number of bits to read to know how long the string is.
     * @param mode - The mode that was originally used to store the string.
     *   - 'standard': All character values < 255 were encoded as single bytes otherwise assume 8 + 32 bits of information were used instead for that character.
     *   - 'optimizeFor7Bits': All character values < 127 were encoded as 7 bits each otherwise assume 7 + 32 bits of information were used instead for that character.
     * 
     * @see `writeString` To write a string that can be read by this method.
     */
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

    /** Writes a boolean value to the bit stream, writing one bit of information. */
    public writeBoolean(value: boolean) {
        this.bits.push(value ? 1 : 0);
    }

    /** Writes any number of boolean value to the bit stream, writing that number of bits of information. */
    public writeBooleans(values: boolean[]) {
        for (let value of values) {
            this.writeBoolean(value);
        }
    }

    /** Writes an unsigned integer value (between 0 and 3 inclusive) to the bit stream, writing two bits of information. */
    public writeHalfNibble(value: number) {
        if (value < 0 || value > 3) {
            throw new Error('Value is out of range for a half nibble.');
        }
        this.writeUInt(value, 2);
    }

    /** Writes an unsigned integer value (between 0 and 15 inclusive) to the bit stream, writing four bits of information. */
    public writeNibble(value: number) {
        if (value < 0 || value > 15) {
            throw new Error('Value is out of range for a nibble.');
        }
        this.writeUInt(value, 4);
    }

    /** Writes an unsigned integer value (between 0 and 255 inclusive) to the bit stream, writing eight bits of information. */
    public writeByte(value: number) {
        if (value < 0 || value > 255) {
            throw new Error('Value is out of range for a byte.');
        }
        this.writeUInt(value, 8);
    }

    /** Writes an unsigned integer value (between 0 and 65,535 inclusive) to the bit stream, writing 16 bits of information. */
    public writeUInt16(value: number) {
        if (value < 0 || value > 65535) {
            throw new Error('Value is out of range for a UInt16.');
        }
        this.writeUInt(value, 16);
    }

    /** Writes an unsigned integer value (between 0 and 4,294,967,295 inclusive) to the bit stream, writing 32 bits of information. */
    public writeUInt32(value: number) {
        if (value < 0 || value > 4294967295) {
            throw new Error('Value is out of range for a UInt32.');
        }
        this.writeUInt(value, 32);
    }

    /** Writes an unsigned 64-bit integer value to the bit stream, writing 64 bits of information. */
    public writeUInt64(value: number) {
        this.writeUInt(value, 64);
    }

    /**
     * Writes an unsigned integer value to the bit stream based on the specified bit length and mode.
     * Used to write information as densely as possible, typically with a small number of bits,
     * while supporting the possibility that the number of bits will be insufficient to store the number
     * (and therfore a larger number of bits is necessary).
     *
     * @param value - The value to write.
     * @param minBits - The number of bits to use when storing the number.
     * @param maxBits - The maximum number of bits use when storing the number, in addition to `minBits`, if it turns out more bits are required to store the number.
     * @param mode - The mode that determines how the value will be stored.
     *   - 'prefixBit': Write a prefix bit that determines whether to write `minBits` or `maxBits`.
     *   - 'optimistic': Write `minBits` of information, but if the value is too large then the space is wasted and an additional `maxBits` of information are written to fully store the value.
     * 
     * @see `readUIntMixed` For reading these values.
     */
    public writeUIntMixed(value: number, minBits: number, maxBits: number, mode: 'prefixBit' | 'optimistic' = 'prefixBit') {
        let maxValue = Math.pow(2, minBits) - 1;
        if (value < 0 || value > Math.pow(2, maxBits) - 1) {
            throw new Error(`Value is out of range for the specified ${maxBits}-bit UInt (${value}).`);
        }
        if (mode === 'prefixBit') {
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

    /**
     * Writes the specified unsigned integer value (between 0 and 65,535 inclusive) as 8 - 24 bits of information.
     * - For `prefixBit` typically 9 bits are written but if the value is too large 17 bits are written instead.
     * - For `optimistic` typically 8 bits are written but if the value is too large an additional 16 bits are written (total 24 bits).
     * 
     * @see `writeUIntMixed` For how the `mode` parameter directs how the information is written.
     */
    public writeMixedByteOrUInt16(value: number, mode: 'prefixBit' | 'optimistic' = 'prefixBit') {
        if (value < 0 || value > 65535) {
            throw new Error('Value is out of range for the mixed byte / UInt16.');
        }
        this.writeUIntMixed(value, 8, 16, mode);
    }

    /**
     * Writes the specified unsigned integer value (between 0 and 4,294,967,295 inclusive) as 16 - 48 bits of information.
     * - For `prefixBit` typically 17 bits are written but if the value is too large 33 bits are written instead.
     * - For `optimistic` typically 16 bits are written but if the value is too large an additional 32 bits are written (total 48 bits).
     * 
     * @see `writeUIntMixed` For how the `mode` parameter directs how the information is written.
     */
    public writeMixedUInt16OrUInt32(value: number, mode: 'prefixBit' | 'optimistic' = 'prefixBit') {
        if (value < 0 || value > 4294967295) {
            throw new Error('Value is out of range for the mixed UInt16 / UInt32.');
        }
        this.writeUIntMixed(value, 16, 32, mode);
    }

    /** Writes `bitCount` number of bits to the bit stream that represent the specified `value`. */
    public writeUInt(value: number, bitCount: number) {
        let maxValue = Math.pow(2, bitCount) - 1;
        if (value < 0 || value > maxValue) {
            throw new Error(`Value is out of range for the ${bitCount}-bit number.`);
        }
        let bits = BitStream.convertUInt64ToBits(value);
        for (let i = 0; i < bitCount; i++) {
            this.bits.push(bits[64 - bitCount + i]);
        }
    }

    /**
     * Writes a string to the bit stream based on the specified characteristics.
     * Strings in bit streams are stored with a length prefix and each character is expected to typically occupy 7 or 8 bits of storage.
     * 
     * @param minLengthBits The minimum number of bits to use as a length prefix, which indicate how long the string is. Strings equal to or longer than this length use `minLengthBits` + `maxLengthBits` instead.
     * @param maxLengthBits The maximum number of bits to use as a length prefix.
     * @param mode - The mode to use when writing the characters themselves.
     *   - 'standard': All character values < 255 are encoded as single bytes otherwise 8 + 32 bits of information will be written instead for a character.
     *   - 'optimizeFor7Bits': All character values < 127 are encoded as 7 bits each otherwise 7 + 32 bits of information will be written instead for a character.
     * 
     * @see `readString` To read a string that is stored by this method.
     */
    public writeString(value: string, minLengthBits: number = 8, maxLengthBits: number = 32, mode: 'standard' | 'optimizeFor7Bits' = 'standard') {
        let n = Math.pow(2, minLengthBits) - 1;
        if (value.length > Math.pow(2, maxLengthBits) - 1) {
            throw new Error(`The string is too long.`);
        }
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

    /** Copies the contents of another bit stream. */
    public writeStream(stream: BitStream) {
        this.bits.push(...stream.bits);
    }

    /** Converts the data in this bit stream into a compact byte array. */
    public toByteArray(): Uint8Array {
        let result = new Uint8Array(Math.ceil(this.bits.length / 8));
        for (let i = 0; i < this.bits.length; i++) {
            let index = Math.floor(i / 8);
            let shift = 7 - (i % 8);
            result[index] += (this.bits[i] ? 1 : 0) << shift;
        }
        return result;
    }

    /** Converts the data in this bit stream into a compact base-64 encoded string. */
    public toString(): string {
        let binary = '';
        let bytes = this.toByteArray();
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /** Returns the size of the bit stream in bytes. */
    public size(): number {
        return Math.ceil(this.bits.length / 8);
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