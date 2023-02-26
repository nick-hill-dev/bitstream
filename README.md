# BitStream Library

The BitStream library makes it easy to read and write binary data to a stream, supporting operations down to the bit level. With BitStream it is possible to read and write numbers of arbitrary bitness as well as strings and other types of data.

Running `tsc -b` at the root will generate a `bitstream.js` file in the `bin` subdirectory. Examples are in the `demos` directory.

## Writing Data

To create a bit stream with some data in it, use the `write*` methods on an instance of the BitStream object. It is possible to define how much space each item of data occupies:

```js
let bits = new BitStream();
bits.writeBoolean(false);
bits.writeByte(100);
bits.writeString('Hello World!');
alert(`Bit Stream is ${bits.size()} bytes long.`);
```

## Reading Data

Following on from the above, it is possible to extract the data from the bit stream:

```js
bits.position = 0; // Position advances as you write so set it to 0 here to reset the cursor to the beginning of the stream
alert(`Boolean: ${bits.readBoolean()}\n` +
      `Byte: ${bits.readByte()}\n` +
      `String: ${bits.readString()}`);
```

### Features

• Support for bits, arrays of bits.
• Supports all kinds of whole numbers: half-nibbles, nibbles, bytes, 2-byte numbers, 4-byte numbers and 8-byte numbers.
• Can use arbitrary numbers of bits to represent a number.
• Can read and write strings.
• Can convert bit streams from and into base64 encoded strings.
• Highly useful for network communications when state needs to be represented with as few bits as possible.

## Maximum Control

It is possible to determine exactly how many bits to write via `writeUInt` or `writeUIntMixed`. The `writeUIntMixed` method supports representation of a number using a smaller number of bits if it is possible to do so (I.E. if a small number is typical) yet supports writing larger numbers with more bits in the "unlikely" scenario of having to write a larger number.

```js
let bits = new BitStream();
bits.writeHalfNibble(3); // Maximum number that can be stored in 2 bits
bits.writeNibble(15); // Maximum number that can be stored in 4 bits
bits.writeByte(255); // Maximum number that can be stored in 8 bits
bits.writeUInt16(65535); // Etc
bits.writeUInt32(Math.pow(2, 32) - 1);
bits.writeUInt64(Math.pow(2, 63) - 1);
bits.writeUInt(63, 6); // Use a maximum of 6 bits, in this case the maximum number that can be stored is 63

let value = Math.floor(Math.random() * 32768);
bits.writeUIntMixed(value, 4, 16); // Use ~4 or ~16 bits to store the number depending on how many bits are actually required
```

## Base64 Encoding

A bit stream can be converted to, I.E. serialized into a base64-encoded string and a base64-encoded string can be deserialized into a bit stream instance.

```js
let bits = new BitStream();
bits.writeBoolean(true);
bits.writeByte(123);
bits.writeString('Hello World!');

let str = bits.toString();
alert(`Bit Stream as base64-encoded string:\n\n${str}`); // vYYkMrY2N5Art7k2MhCA

let bitsDecoded = BitStream.fromString(str);
alert(`Boolean: ${bits.readBoolean()}\n` +
      `Byte: ${bits.readByte()}\n` +
      `String: ${bits.readString()}`);
```

## License

The BitStream library is released under the MIT license. See LICENSE for more information.