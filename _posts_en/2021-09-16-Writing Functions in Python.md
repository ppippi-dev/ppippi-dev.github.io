---
layout: post
title: "Writing Functions in Python"
categories: [DataCamp, Python]
tags: [DataCamp, Python]
---

#### Docstring
- What the function does.
- Arguments it accepts.
- Return values.
- Errors it intentionally raises.
- Any other notes you want to record about the function.

<br>

#### Docstring Formats
- Google Style
- Numpydoc
- reStructuredText
- EpyText

<br>

#### Google Style

```python
def function(arg_1, arg_2 = 42):
    """Description of what the function does.

    Args:
        arg_1 (str): Description of arg_1 that can break onto the next line if needed.
        arg_2 (int, optional): Write optional when an argument has a default value.

    Returns:
        bool: Optional description of the return value
        Extra lines are not indented.

    Raises:
        ValueError: Include any error types that the function intentionally raises.

    Notes:
        See https://www.datacamp.com/community/tutorials/docstrings-python
    """
```

<br>

#### Numpydoc

```python
def function(arg_1, arg_2=42):
    """
    Description of what the function does.

    Parameters
    ----------
    arg_1 : expected type of arg_1
        Description of arg_1
    arg_2 : int, optional
        Write optional when an argument has a default value.
        Default=42.

    Returns
    -------
    The type of the return value
        Can include a description of the return value.
        Replace "Returns" with "Yields" if this function is a generator.
    """
```

<br>

#### Retrieving Docstrings

```python
def the_answer():
    """Return the answer to life, the universe, and everything.

    Returns:
        int
    """
```

You can read a function’s docstring with `function.__doc__`.

```python
import inspect
docstring = inspect.getdoc(pd.read_csv)
```

<br>

#### Don't Repeat Yourself (DRY)

```python
train = pd.read_csv("train.csv")
train_y = train["labels"].values
train_x = train[col for col in train.columns if col != "labels"].values
train_pca = PCA(n_components=2).fit_transform(train_x)
plt.scatter(train_pca[:, 0], train_pca[:, 1])

val = pd.read_csv("val.csv")
val_y = val["labels"].values
val_x = val[col for col in val.columns if col != "labels"].values
val_pca = PCA(n_components=2).fit_transform(val_x)
plt.scatter(val_pca[:, 0], val_pca[:, 1])

test = pd.read_csv("test.csv")
test_y = test["labels"].values
test_x = test[col for col in test.columns if col != "labels"].values
test_pca = PCA(n_components=2).fit_transform(test_x)
plt.scatter(test_pca[:, 0], test_pca[:, 1])
```

The code for `train`, `val`, and `test` is repeated three times.

<br>

#### Problems with Repetition

- Bugs in one copy are hard to notice in the others.
- Changes have to be applied everywhere, increasing the chance of mistakes.

```python
def load_and_plot(path):
    """Load a data set and plot the first two principal components.

    Args:
        path (str): The location of a CSV file.

    Returns:
        tuple of ndarray: (features, labels)
    """
    data = pd.read_csv(path)
    y = data["label"].values
    x = data[col for col in data.columns if col != "label"].values
    pca = PCA(n_components=2).fit_transform(x)
    plt.scatter(pca[:, 0], pca[:, 1])
    return x, y

train_x, train_y = load_and_plot("train.csv")
val_x, val_y = load_and_plot("val.csv")
test_x, test_y = load_and_plot("test.csv")
```

<br>

#### Do One Thing

```python
def load_data(path):
    """Load a data set.

    Args:
        path (str): The location of a CSV file.

    Returns:
        tuple of ndarray: (features, labels)
    """
    data = pd.read_csv(path)
    y = data["label"].values
    x = data[col for col in data.columns if col != "label"].values
    return x, y
```

```python
def plot_data(x):
    """Plot the first two principal components of a matrix.

    Args:
        x (numpy.ndarray): The data to plot.
    """
    pca = PCA(n_components=2).fit_transform(x)
    plt.scatter(pca[:, 0], pca[:, 1])
```

Splitting the responsibilities makes the code flexible: you can load without plotting or plot previously loaded data. It also gets easier to understand, test, and debug.

<br>

#### Pass by Assignment

```python
a = [1, 2, 3]
b = a
a.append(4)
print(b)

b.append(5)
print(a)

a = 42
print(b)
```

Output:

```
[1, 2, 3, 4]
[1, 2, 3, 4, 5]
[1, 2, 3, 4, 5]
```

<br>

#### Context Managers

```python
with <context-manager>(<args>) as <variable_name>:
    # Code inside the context runs here

# This code runs after the context exits
```

```python
with open("my_file.txt") as my_file:
    text = my_file.read()
    length = len(text)

print("The file is {} characters long".format(length))
```

```python
@contextlib.contextmanager
def my_context():
    # Add any setup code you need
    yield
    # Add any teardown code you need
```

```python
import contextlib

@contextlib.contextmanager
def my_context():
    print("hello")
    yield 42
    print("goodbye")

with my_context() as foo:
    print("foo is {}".format(foo))
```

Output:

```
hello
foo is 42
goodbye
```

```python
@contextlib.contextmanager
def database(url):
    # set up database connection
    db = postgres.connect(url)
    yield db
    # tear down database connection
    db.disconnect()

url = "http://datacamp.com/data"
with database(url) as my_db:
    course_list = my_db.execute("SELECT * FROM courses")
```

<br>

#### Handling Errors

```python
try:
    # code that might raise an error
except:
    # do something about the error
finally:
    # this code runs no matter what
```

```python
def get_printer(ip):
    p = connect_to_printer(ip)
    try:
        yield p
    finally:
        p.disconnect()
        print("disconnected from printer")

doc = {"text": "This is my text."}

with get_printer("10.0.34.111") as printer:
    printer.print_page(doc["text"])
```

<br>

#### Functions as Variables

```python
def my_function():
    print("Hello")

x = my_function
type(x)

x()

PrintMcPrintface = print
PrintMcPrintface("Python is awesome!")
```

Output:

```
<type 'function'>
Hello
Python is awesome!
```

<br>

#### Lists and Dictionaries of Functions

```python
list_of_functions = [my_function, open, print]
list_of_functions[2]("I am printing with an element of a list")

dict_of_functions = {
    "func1": my_function,
    "func2": open,
    "func3": print,
}
dict_of_functions["func3"]("I am printing with a value of dict!")
```

<br>

#### Referencing a Function

```python
def my_function():
    return 42

x = my_function
my_function()
my_function
```

Output:

```
42
<function __main__.my_function>
```

<br>

#### Functions as Arguments

```python
def has_docstring(func):
    """Check to see if the function `func` has a docstring.

    Args:
        func (callable): A function.

    Returns:
        bool
    """
    return func.__doc__ is not None

def no():
    return 42

def yes():
    """Return the value 42"""
    return 42

has_docstring(no)
has_docstring(yes)
```

Output:

```
False
True
```

<br>

#### Defining a Function Inside Another Function

```python
def foo(x, y):
    if x > 4 and x < 10 and y > 4 and y < 10:
        print(x * y)
```

```python
def foo(x, y):
    def in_range(v):
        return v > 4 and v < 10

    if in_range(x) and in_range(y):
        print(x * y)
```

<br>

#### Functions as Return Values

```python
def get_function():
    def print_me(s):
        print(s)
    return print_me

new_func = get_function()
new_func("This is a sentence.")
```

Output:

```
This is a sentence.
```

<br>

#### Scope

```python
x = 7
y = 200
print(x)

def foo():
    x = 42
    print(x)
    print(y)
foo()

x = 7
def foo():
    global x
    x = 42
    print(x)
foo()
print(x)

def foo():
    x = 10
    def bar():
        nonlocal x
        x = 200
        print(x)
    bar()
    print(x)
foo()
```

Output:

```
7
42
200
42
42
200
200
```

<br>

#### Closures

```python
def foo():
    a = 5
    def bar():
        print(a)
    return bar

func = foo()

print(func())
print(type(func.__closure__))
print(len(func.__closure__))
```

Output:

```
5
<class 'tuple'>
1
```

<br>

#### Definitions – Nested Function

```python
# outer function
def parent():
    # nested function
    def child():
        pass
    return child
```

<br>

#### Definitions – Nonlocal Variables

```python
def parent(arg_1, arg_2):
    # From child()'s point of view,
    # 'value' and 'my_dict' are nonlocal variables,
    # as are 'arg_1' and 'arg_2'
    value = 22
    my_dict = {"chocolate": "yummy"}

    def child():
        print(2 * value)
        print(my_dict["chocolate"])
        print(arg_1 + arg_2)

    return child
```

<br>

#### Closure: Nonlocal Variables Attached to the Returned Function

```python
def parent(arg_1, arg_2):
    value = 22
    my_dict = {"chocolate": "yummy"}

    def child():
        print(2 * value)
        print(my_dict["chocolate"])
        print(arg_1 + arg_2)

    return child

new_function = parent(3, 4)
print([cell.cell_contents for cell in new_function.__closure__])
```

Output:

```
[3, 4, {'chocolate': 'yummy'}, 22]
```

<br>

#### Decorators

```python
@double_args
def multiply(a, b):
    return a * b

multiply(1, 5)
```

```python
def multiply(a, b):
    return a * b

def double_args(func):
    # Define a new function that we can modify
    def wrapper(a, b):
        # For now, just call the unmodified function
        return func(a * 2, b * 2)
    return wrapper

new_multiply = double_args(multiply)
new_multiply(1, 5)
```

Output:

```
20
```

<br>

#### Time a Function

```python
import time

def timer(func):
    """A decorator that shows how long a function took to run."""
    # Define the wrapper function to return.
    def wrapper(*args, **kwargs):
        # When wrapper() is called, get the current time.
        t_start = time.time()
        # Call the decorated function and store the result.
        result = func(*args, **kwargs)
        # Get the total time it took to run, and print it
        t_total = time.time() - t_start
        print("{} took {}s".format(func.__name__, t_total))
        return result
    return wrapper

@timer
def sleep_n_seconds(n):
    time.sleep(n)

sleep_n_seconds(5)
```

Output:

```
sleep_n_seconds took 5.005098819732666s
```

<br>

#### Decorators and Metadata

```python
@timer
def sleep_n_seconds(n=10):
    """Pause processing for n seconds.

    Args:
        n (int): The number of seconds to pause for.
    """
    time.sleep(n)
print(sleep_n_seconds.__doc__)
print(sleep_n_seconds.__name__)
```

Output:

```
None
wrapper
```

Use `functools.wraps()` to preserve metadata.

```python
from functools import wraps

def timer(func):
    """A decorator that shows how long a function took to run."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        t_start = time.time()
        result = func(*args, **kwargs)
        t_total = time.time() - t_start
        print("{} took {}s".format(func.__name__, t_total))
        return result
    return wrapper

@timer
def sleep_n_seconds(n=10):
    """Pause processing for n seconds.

    Args:
        n (int): The number of seconds to pause for.
    """
    time.sleep(n)
print(sleep_n_seconds.__doc__)
print(sleep_n_seconds.__name__)
```

Output:

```
Pause processing for n seconds.

    Args:
        n (int): The number of seconds to pause for.

sleep_n_seconds
```

You can also access the undecorated function with `__wrapped__`:

```python
@timer
def sleep_n_seconds(n=10):
    """Pause processing for n seconds.

    Args:
        n (int): The number of seconds to pause for.
    """
    time.sleep(n)
print(sleep_n_seconds.__wrapped__)
```

Output:

```
<function sleep_n_seconds at 0x7f3245720cb0>
```

<br>

#### Decorators That Take Arguments

```python
def run_three_times(func):
    def wrapper(*args, **kwargs):
        for _ in range(3):
            func(*args, **kwargs)
    return wrapper

@run_three_times
def print_sum(a, b):
    print(a + b)
print_sum(3, 5)
```

Output:

```
8
8
8
```

<br>

#### `run_n_times()`

```python
def run_n_times(n):
    """Define and return a decorator."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            for _ in range(n):
                func(*args, **kwargs)
        return wrapper
    return decorator

@run_n_times(3)
def print_sum(a, b):
    print(a + b)
print_sum(3, 5)

run_three_times = run_n_times(3)

@run_three_times
def print_sum(a, b):
    print(a + b)
print_sum(1, 3)
```

Output:

```
8
8
8
4
4
4
```

<br>

#### `timeout()`: A Real-World Example

```python
import signal

def raise_timeout(*args, **kwargs):
    raise TimeoutError()
# When an "alarm" signal goes off, call raise_timeout()
signal.signal(signalnum=signal.SIGALRM, handler=raise_timeout)
# Set off an alarm in 5 seconds
signal.alarm(5)
# Cancel the alarm
signal.alarm(0)
```

```python
def timeout_in_5s(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Set an alarm for 5 seconds
        signal.alarm(5)
        try:
            # Call the decorated function
            return func(*args, **kwargs)
        finally:
            # Cancel the alarm
            signal.alarm(0)
    return wrapper

@timeout_in_5s
def foo():
    time.sleep(10)
    print("foo!")

foo()
```

Output:

```
TimeoutError:
```
