---
description: Writing Efficient Python Code
pubDate: '2021-09-14'
tags:
- DataCamp
- Python
title: Writing Efficient Python Code
---

#### What Does Efficient Programming Mean?

- Fast execution with minimal wait time between running code and seeing results.
- Sensible resource use that avoids unnecessary overhead.

Exact definitions of “fast runtime” and “low memory usage” depend on the task.  
The goal of writing efficient code is to reduce both latency and overhead.

<br>

#### Python

Python is known for readable code.  
Idiomatic Python is often described as “Pythonic.”  
Pythonic code tends to be concise and easy to understand.

Non-Pythonic code:

```python
double_numbers = []
for i in range(len(numbers)):
    double_numbers.append(numbers[i] * 2)
```

Pythonic code:

```python
doubled_numbers = [x * 2 for x in numbers]
```

Python will still run non-Pythonic code, but that style often executes more slowly. I used to think inline code was purely about aesthetics, yet benchmarks show it can be faster too.

<br>

#### The Zen of Python

```python
import this

The Zen of Python, by Tim Peters

Beautiful is better than ugly.
Explicit is better than implicit.
Simple is better than complex.
Complex is better than complicated.
Flat is better than nested.
Sparse is better than dense.
Readability counts.
Special cases aren't special enough to break the rules.
Although practicality beats purity.
Errors should never pass silently.
Unless explicitly silenced.
In the face of ambiguity, refuse the temptation to guess.
There should be one-- and preferably only one --obvious way to do it.
Although that way may not be obvious at first unless you're Dutch.
Now is better than never.
Although never is often better than *right* now.
If the implementation is hard to explain, it's a bad idea.
If the implementation is easy to explain, it may be a good idea.
Namespaces are one honking great idea -- let's do more of those!
```

<br>

#### Built-in Types
- `list`
- `tuple`
- `set`
- `dict`

<br>

#### Handy Functions
- `print()`
- `len()`
- `range()`
- `round()`
- `enumerate()`
- `map()`
- `zip()`
- and more

<br>

#### Useful Modules
- `os`
- `sys`
- `itertools`
- `collections`
- `math`
- and others

<br>

#### `range`

```python
nums = range(0, 11)
nums_list = list(nums)
print(nums_list)

# Output:
# [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# Step by twos
nums = range(2, 11, 2)
nums_list = list(nums)
print(nums_list)

# Output:
# [2, 4, 6, 8, 10]
```

<br>

#### `enumerate()`

```python
letters = ["a", "b", "c", "d"]
indexed_letters = enumerate(letters)
print(list(indexed_letters))

# Output:
# [(0, "a"), (1, "b"), (2, "c"), (3, "d")]

# Custom start index
letters = ["a", "b", "c", "d"]
indexed_letters = enumerate(letters, start=5)
print(list(indexed_letters))

# Output:
# [(5, "a"), (6, "b"), (7, "c"), (8, "d")]
```

<br>

#### `map()`

```python
nums = [1.5, 2.3, 3.4, 4.6, 5.0]
rnd_nums = map(round, nums)
print(list(rnd_nums))

# Output:
# [2, 2, 3, 5, 5]

# With lambda
nums = [1, 2, 3, 4, 5]
sqrd_nums = map(lambda x: x ** 2, nums)
print(list(sqrd_nums))

# Output:
# [1, 4, 9, 16, 25]
```

<br>

#### Practice

```python
# Create a list of odd numbers from 1 to 11 by unpacking a range
nums_list2 = [*range(1, 12, 2)]
print(nums_list2)

# Output:
# [1, 3, 5, 7, 9, 11]
```

I used to rely on `list(range(1, 12, 2))`, but `[ *range(...) ]` is cleaner—and faster.

<br>

#### NumPy

```python
import numpy as np

nums_np = np.array(range(5))
print(nums_np)

# Output:
# [0 1 2 3 4]

print(nums_np.dtype)

# Output:
# int64
```

```python
# Mixing integers and floats
nums_np_float = np.array([1, 2.5, 3])
print(nums_np_float)
print(nums_np_float.dtype)

# Output:
# [1.  2.5 3. ]
# float64
```

NumPy promotes to the most general type that can hold all values.

```python
nums = [-2, -1, 0, 1, 2]
print(nums ** 2)

# Output:
# TypeError
```

Plain Python lists cannot handle this vectorized power operation.

```python
nums = [-2, -1, 0, 1, 2]
[*map(lambda x: x ** 2, nums)]

# Output:
# [4, 1, 0, 1, 4]
```

This works but is clunky.

```python
# With NumPy
nums = np.array([-2, -1, 0, 1, 2])
print(nums ** 2)

# Output:
# [4 1 0 1 4]
```

Vectorization in NumPy is both clean and fast.

```python
# NumPy indexing
nums2 = [[1, 2, 3],
         [4, 5, 6]]

print(nums2[0][1])
print([row[0] for row in nums2])  # without NumPy

nums2 = np.array(nums2)

print(nums2[0, 1])
print(nums2[:, 0])

# Output:
# 2
# [1 4]
```

```python
# Boolean indexing
nums = np.array([-2, -1, 0, 1, 2])

print(nums > 0)
print(nums[nums > 0])

# Output:
# [False False False  True  True]
# [1 2]
```

<br>

#### Using `%timeit`

```python
%timeit rand_nums = np.random.rand(1000)
```

Output example:

```
The slowest run took 4.61 times longer than the fastest. This could mean that an intermediate result is being cached.
100000 loops, best of 5: 9.72 µs per loop
```

I previously relied on `time.time()` after importing `time`, but `%timeit` gives much richer insights.

<br>

#### Specifying Number of Runs/Loops

```python
%timeit -r2 -n10 rand_nums = np.random.rand(1000)
```

The `-r` flag controls the number of runs, and `-n` sets the number of loops per run.

<br>

#### Using `%timeit` in Cell Magic Mode

```python
%%timeit
nums = []
for x in range(10):
    nums.append(x)
```

<br>

#### Saving Timing Output

```python
times = %timeit -o rand_nums = np.random.rand(1000)

# Later:
times.timings   # Not available in some environments (e.g., Colab)
times.best
times.worst
```

Example outputs:

```
times.best   -> 9.871182670012786e-06
times.worst  -> 0.00011633400026767049
```

<br>

#### Comparing Timings

```python
f_time = %timeit -o formal_dict = dict()
l_time = %timeit -o literal_dict = {}
diff = (f_time.compile_time - l_time.compile_time) * (10 ** 9)
print("l_time better than f_time by {} ns".format(diff))
```

Literal dictionaries are quicker to initialize than calling `dict()`.

<br>

#### Code Profiling

Code profiling measures how long each part of a program takes to execute.  
Install `line_profiler` (`pip install line_profiler`) before using it.

```python
def convert_units(heroes, heights, weights):
    new_hts = [ht * 0.39370 for ht in heights]
    new_wts = [wt * 2.20462 for wt in weights]

    hero_data = {}

    for i, hero in enumerate(heroes):
        hero_data[hero] = (new_hts[i], new_wts[i])

    return hero_data

%load_ext line_profiler
heroes = ["Batman", "Superman", "Wonder Woman"]
hts = np.array([188.0, 191.0, 183.0])
wts = np.array([95.0, 101.0, 74.0])

%lprun -f convert_units convert_units(heroes, hts, wts)
```

Sample output:

```
Timer unit: 1e-06 s

Total time: 0.000159 s
Function: convert_units at line 1

Line #      Hits         Time  Per Hit   % Time  Line Contents
==============================================================
     1                                           def convert_units(heroes, heights, weights):
     2         1        144.0    144.0     90.6      new_hts = [ht * 0.39370 for ht in heights]
     3         1          5.0      5.0      3.1      new_wts = [wt * 2.20462 for wt in weights]
     5         1          1.0      1.0      0.6      hero_data = {}
     7         4          4.0      1.0      2.5      for i, hero in enumerate(heroes):
     8         3          4.0      1.3      2.5          hero_data[hero] = (new_hts[i], new_wts[i])
    10         1          1.0      1.0      0.6      return hero_data
```

<br>

#### Quick-and-Dirty Memory Check

```python
import sys

nums_list = [*range(1000)]
sys.getsizeof(nums_list)

# Output:
# 9120
```

For deeper profiling install `memory_profiler` (`pip install memory_profiler`):

```python
%load_ext memory_profiler
%mprun -f convert_units convert_units(heroes, hts, wts)
```

<br>

#### `zip`

```python
names = ["Bulbasaur", "Charmander", "Squirtle"]
hps = [45, 39, 44]

combined = zip(names, hps)
print([*combined])

# Output:
# [("Bulbasaur", 45), ("Charmander", 39), ("Squirtle", 44)]
```

<br>

#### `collections`

- `namedtuple`
- `deque`
- `Counter`
- `OrderedDict`
- `defaultdict`

<br>

#### `Counter`

```python
from collections import Counter

poke_types = ["Grass", "Dark", "Fire", "Fries"]
Counter(poke_types)

# Output:
# Counter({"Dark": 1, "Fire": 1, "Fries": 1, "Grass": 1})
```

<br>

#### `itertools`

- `product`
- `permutations`
- `combinations`

<br>

#### `combinations`

```python
from itertools import combinations

poke_types = ["Grass", "Dark", "Fire", "Fries", "Ghost"]
print([*combinations(poke_types, 2)])

# Output:
# [("Grass", "Dark"), ("Grass", "Fire"), ("Grass", "Fries"), ("Grass", "Ghost"),
#  ("Dark", "Fire"), ("Dark", "Fries"), ("Dark", "Ghost"),
#  ("Fire", "Fries"), ("Fire", "Ghost"),
#  ("Fries", "Ghost")]
```

<br>

#### Set Theory Helpers

- `intersection()`
- `difference()`
- `symmetric_difference()`
- `union()`

```python
list_a = ["Bulbasaur", "Charmander", "Squirtle"]
list_b = ["Caterpie", "Pidgey", "Squirtle"]

set_a = set(list_a)
set_b = set(list_b)

print(set_a.intersection(set_b))          # set_a & set_b
print(set_a.difference(set_b))            # set_a - set_b
print(set_b.difference(set_a))            # set_b - set_a
print(set_a.symmetric_difference(set_b))  # set_a ^ set_b
print(set_a.union(set_b))                 # set_a | set_b

# Output:
# {"Squirtle"}
# {"Charmander", "Bulbasaur"}
# {"Caterpie", "Pidgey"}
# {"Caterpie", "Bulbasaur", "Charmander", "Pidgey"}
# {"Pidgey", "Charmander", "Caterpie", "Squirtle", "Bulbasaur"}
```

I often use the symbolic operators (`&`, `-`, `|`, `^`) because they are concise.

```python
names_list = [*range(1000)]
names_tuple = (*range(1000),)
names_set = set(range(1000))

%timeit 200 in names_list
%timeit 200 in names_tuple
%timeit 200 in names_set
```

Example outputs:

```
100000 loops, best of 5: 3.12 µs per loop
100000 loops, best of 5: 3.11 µs per loop
10000000 loops, best of 5: 57.5 ns per loop
```

Membership checks on sets are dramatically faster.

```python
primary_types = [1, 2, 3, 1, 2, 3]
unique_type = set(primary_types)
print(unique_type)

# Output:
# {1, 2, 3}
```

Great for eliminating duplicates.

<br>

#### Looping in Python

- `for`
- `while`
- nested loops

> Flat is better than nested.

```python
poke_stats = [[90, 92, 75, 60],
              [25, 20, 15, 90],
              [65, 130, 60, 75]]

totals = []
for row in poke_stats:
    totals.append(sum(row))

totals_comp = [sum(row) for row in poke_stats]
totals_map = [*map(sum, poke_stats)]

# Output:
# [317, 150, 330]
```

```python
%%timeit
totals = []
for row in poke_stats:
    totals.append(sum(row))

%timeit totals_comp = [sum(row) for row in poke_stats]
%timeit totals_map = [*map(sum, poke_stats)]
```

Example timings show that `map` is both concise and the fastest.

<br>

#### NumPy Approach

```python
avgs = []
for row in poke_stats:
    avgs.append(np.mean(row))
print(avgs)

avgs_np = np.array(poke_stats).mean(axis=1)
print(avgs_np)
```

```python
%%timeit
avgs = []
for row in poke_stats:
    avgs.append(np.mean(row))

%timeit avgs_np = np.array(poke_stats).mean(axis=1)
```

Vectorized NumPy code is much faster.

<br>

#### Writing Better Loops

Move work outside the loop if it does not depend on the loop itself.

<br>

#### Basic Pandas Optimizations

Inefficient approach:

```python
%%timeit
win_perc_list = []

for i in range(len(baseball_df)):
    row = baseball_df.iloc[i]
    wins = row["W"]
    games_played = row["G"]
    win_perc = calc_win_perc(wins, games_played)
    win_perc_list.append(win_perc)

baseball_df["WP"] = win_perc_list
```

<br>

#### `iterrows()`

```python
%%timeit
win_perc_list = []
for i, row in baseball_df.iterrows():
    wins = row["W"]
    games_played = row["G"]
    win_perc = calc_win_perc(wins, games_played)
    win_perc_list.append(win_perc)

baseball_df["WP"] = win_perc_list
```

Using `iterrows()` is roughly twice as fast as manual indexing.

<br>

#### `itertuples()`

Returns a specialized tuple-like object from the `collections` module with attribute access.

```python
%%timeit
for row_namedtuple in baseball_df.itertuples():
    print(row_namedtuple)

%%timeit
for row_namedtuple in baseball_df.iterrows():
    print(row_namedtuple)
```

`itertuples()` is dramatically faster than `iterrows()`.

<br>

#### `apply()`

```python
%timeit baseball_df.apply(lambda row: calc_win_perc(row["RS"], row["RA"]), axis=1)
```

<br>

#### `.values`

```python
wins = baseball_df["W"]
print(type(wins))          # pandas Series

wins_np = baseball_df["W"].values
print(type(wins_np))       # numpy.ndarray
```

Converting to NumPy makes vectorized math easy:

```python
baseball_df["RS"].values - baseball_df["RA"].values
```

```python
%timeit baseball_df["RS"].values - baseball_df["RA"].values
%timeit baseball_df["RS"] - baseball_df["RA"]
```

Again, vectorized NumPy operations win.
