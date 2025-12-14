---
description: Scala
pubDate: '2022-02-03'
tags:
- DataCamp
- Scala
title: Scala
---

#### A Scalable Language

Scala is a concise, expressive language powering some of the world’s largest applications and data pipelines. The name literally blends *Sca*lable + *La*nguage.

#### Why Scala?

- General-purpose, JVM-based (runs anywhere Java runs; interoperable with existing libraries).
- Scales from small scripts to distributed systems (Spark, Akka, etc.).
- Supports both object-oriented programming (everything is an object, operations are method calls) and functional programming (functions are first-class values; favor expressions over mutable state).
- Typically far more concise than Java (often ~10× less code).
- Advanced static type system enables flexible, high-level abstractions while catching bugs at compile time.

Common adopters include software/data engineers, data scientists, and ML engineers across finance, tech, healthcare, and beyond.

<br>

#### Working with the REPL

Launch `scala` to enter the interpreter:

```scala
scala> 2 + 3
val res0: Int = 5

scala> res0 * 2
val res1: Int = 10

scala> println("Let's play Twenty-One!")
Let's play Twenty-One!
```

Results are bound to `res0`, `res1`, … for quick experimentation.

<br>

#### `val` vs `var`

- `val` is immutable (cannot be reassigned):

```scala
val a: Int = 4
// a = 2  // error: reassignment to val
```

- `var` is mutable (can be reassigned):

```scala
var b = 1
b = 2  // OK
```

Prefer `val` for safety. Primitive types mirror Java (`Int`, `Long`, `Boolean`, etc.). Scala infers types when omitted.

<br>

#### Running Code

- **Scripts**: sequential commands in a file (quick tasks).
- **Applications**: compiled with `scalac`, run with `scala` (multiple source files, better for large projects).

```scala
object Game extends App {
  println("Let's play Twenty-One!")
}
```

Compile with `scalac Game.scala`, run with `scala Game`.

Use IntelliJ IDEA + sbt (Simple Build Tool) for real-world projects.

<br>

#### Functions

Functions have parameters, a body, and a return type:

```scala
def bust(hand: Int): Boolean = hand > 21

bust(10)  // false
bust(22)  // true
```

Functions are first-class values: pass them around, return them, store them.

<br>

#### Collections

Scala provides mutable and immutable collections.

- **Arrays** (mutable, fixed-size):

```scala
val players = Array("Alex", "Chen", "Marta")
players(1) = "KB"
```

You can parameterize arrays: `new Array[String](3)`. Use `Array[Any]` for mixed types (avoid when possible).

- **Lists** (immutable linked lists):

```scala
val players = List("Alex", "Chen", "Marta")
val newPlayers = "Sindhu" :: players  // prepend
val allPlayers = players ::: List("Jo") // concat
val empty = Nil
```

Because Lists are immutable, operations return new lists. Use `var` only when you truly need reassignment.

Scala favors immutability: safer reasoning, fewer bugs, simpler tests—though you can still choose mutable structures if necessary.

<br>

#### Type System

Scala is statically typed and compiled:
- Types known at compile time → optimized bytecode on the JVM.
- Static typing catches errors early, supports refactoring, and documents intent.
- Advanced type inference reduces verbosity.

<br>

#### Control Flow

Basic constructs:

```scala
val hand = 24
if (hand > 21) println("This hand busts!")

val maxHand = if (handA > handB) handA else handB
```

Use braces even for single-line blocks for clarity. Scala’s `if` expression returns a value.

Loops:

```scala
var i = 0
while (i < hands.length) {
  println(hands(i))
  i += 1
}
```

Prefer higher-order methods (e.g., `hands.foreach`) in functional code.

<br>

#### Imperative vs Functional Style

- **Imperative**: mutate state (`var`, loops, side effects). Sometimes necessary, but harder to reason about.
- **Functional**: pure functions, immutable data, expressions returning values. Easier to test, reuse, and parallelize.

Scala blends both. Aim for immutable structures (`val`, pure functions) and reach for mutability only when it simplifies the problem.

Example using functional style:

```scala
val hands = Array(17, 24, 21)
def bust(hand: Int): Boolean = hand > 21
hands.foreach(h => println(bust(h)))
```

`println` is a side effect (returns `Unit`), so keep side-effecting code at the edges of your program.

<br>

Scala’s hybrid OOP/FP model gives you the flexibility to write expressive, scalable code—ideal for everything from scripting to large distributed systems.
