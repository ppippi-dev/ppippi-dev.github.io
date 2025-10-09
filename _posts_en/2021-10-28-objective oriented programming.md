---
layout: post
title: "Object-Oriented Programming in Python"
categories: [DataCamp, Python]
tags: [DataCamp, Python]
---

#### OOP Fundamentals

OOP stands for *Object-Oriented Programming*.  
An object combines **state** and **behavior** into a single data structure that encapsulates both pieces of information. The hallmark of OOP is this bundling of attributes (state) and methods (behavior).

<br>

#### Objects in Python

- In Python, everything is an object.
- Every object belongs to a class.

| Object         | Class     |
| -------------- | --------- |
| 5              | `int`     |
| `"Hello"`      | `str`     |
| `pd.DataFrame()` | `DataFrame` |
| `np.mean`      | `function` |

Because objects expose a unified interface, for example, you can work with every `DataFrame` the same way.

- Use `type()` to check an object’s class.

```python
import numpy as np
a = np.array([1, 2, 3, 4])
print(type(a))
# Output: <class 'numpy.ndarray'>
```

<br>

#### Attributes and Methods

Attributes describe state.

```python
import numpy as np
a = np.array([1, 2, 3, 4])
a.shape            # attribute access – no parentheses
```

Methods describe behavior.

```python
import numpy as np
a = np.array([1, 2, 3, 4])
a.reshape(...)     # method call – requires parentheses
```

Objects = attributes + methods

- Attribute ↔ variable ↔ `obj.my_attribute`
- Method ↔ function ↔ `obj.my_method()`

```python
import numpy as np
a = np.array([1, 2, 3, 4])
dir(a)              # list all attributes and methods
```

<br>

#### Class Anatomy: Attributes and Methods

Basic class structure:

```python
class Customer:
    # code for the class goes here
    pass

c1 = Customer()
c2 = Customer()
```

- Class names use PascalCase (start with a capital letter).
- Call `ClassName()` to instantiate the class.

```python
class Customer:

    def identify(self, name):
        print("I am Customer " + name)

cust = Customer()
cust.identify("Laura")
# Output: I am Customer Laura
```

Methods look just like normal functions except the first parameter is `self`. When you call a method (`cust.identify(...)`), Python automatically passes the instance as the first argument.

<br>

#### What Is `self`?

`self` lets the method know which instance it is operating on. Python handles `self` automatically when you use dot notation.

```python
cust.identify("Laura")
# under the hood: Customer.identify(cust, "Laura")
```

Therefore you never supply `self` explicitly when calling a method.

<br>

#### We Need Attributes

Encapsulation means the data describing an object’s state should live inside the object itself.

```python
class Customer:
    # set the name attribute of an object to new_name
    def set_name(self, new_name):
        self.name = new_name    # creates .name when set_name is called

cust = Customer()
cust.set_name("Lara de Silva")
print(cust.name)
# Output: Lara de Silva
```

assigning to `self.name` creates the `name` attribute on the instance.

<br>

#### Class Anatomy: The `__init__` Constructor

Instead of creating attributes after instantiation, define them inside `__init__()`.

```python
class Customer:
    def __init__(self, name):
        self.name = name
        print("The __init__ method was called")

cust = Customer("Lara de Silva")
print(cust.name)
# Output:
# The __init__ method was called
# Lara de Silva
```

`__init__` runs automatically whenever you instantiate the class.

```python
class Customer:
    def __init__(self, name, balance):
        self.name = name
        self.balance = balance
        print("The __init__ method was called")

cust = Customer("Lara de Silva", 1000)
print(cust.name)
print(cust.balance)
# Output:
# The __init__ method was called
# Lara de Silva
# 1000
```

You can provide default values:

```python
class Customer:
    def __init__(self, name, balance=0):
        self.name = name
        self.balance = balance
        print("The __init__ method was called")

cust = Customer("Lara de Silva")
print(cust.name)
print(cust.balance)
# Output:
# The __init__ method was called
# Lara de Silva
# 0
```

As a rule of thumb, define attributes inside the constructor so everything is easy to locate (classes can grow to hundreds of lines).

<br>

#### Tips for Designing Classes

- Set attributes inside `__init__()`.
- Use CamelCase for class names (no underscores; begin with a capital letter).
- Use lowercase_with_underscores for methods and attributes.
- Keep the first parameter `self`. (You *could* use another name, but don’t.)

```python
class MyClass:
    # works, but not recommended
    def my_method(kitty, attr):
        kitty.attr = attr
```

- Add docstrings so `help()` displays useful information.

<br>

#### Core Principles of OOP

- Inheritance
- Polymorphism
- Encapsulation

Class attributes (defined at the class level) let data be shared across instances.

```python
class MyClass:
    CLASS_ATTR_NAME = attr_value
```

This creates a class-level variable accessible to every instance.

```python
class Employee:
    MIN_SALARY = 30000

    def __init__(self, name, salary):
        self.name = name
        if salary >= Employee.MIN_SALARY:
            self.salary = salary
        else:
            self.salary = Employee.MIN_SALARY

emp1 = Employee("TBD", 40000)
print(emp1.MIN_SALARY)   # 30000

emp2 = Employee("TBD", 60000)
print(emp2.MIN_SALARY)   # 30000
```

`MIN_SALARY` is shared by every employee. Note you reference it via `ClassName.attribute`, not `self`.

Typical uses:
- Define shared minima/maxima.
- Store special constants (like π).

<br>

#### Class Methods

```python
class MyClass:

    @classmethod
    def my_awesome_method(cls, *args):
        # operate on class-level state only
        ...

MyClass.my_awesome_method(args...)
```

Because class methods operate at the class level, decorate them with `@classmethod`. They can’t access instance attributes.

```python
class Employee:
    MIN_SALARY = 30000

    def __init__(self, name, salary):
        self.name = name
        if salary >= Employee.MIN_SALARY:
            self.salary = salary
        else:
            self.salary = Employee.MIN_SALARY

    @classmethod
    def from_file(cls, filename):
        with open(filename, "r") as f:
            name = f.readline()
        return cls(name)

emp = Employee.from_file("employee_data.txt")
type(emp)
```

You only get one `__init__`, so class methods act as alternate constructors. Conventionally, use `cls` instead of `self`.

<br>

#### Class Inheritance

Plenty of great modules already exist, but you can adapt them via inheritance:

```python
class MyChild(MyParent):
    # extend or modify behavior here
    ...
```

```python
class BankAccount:
    def __init__(self, balance):
        self.balance = balance
    def withdraw(self, amount):
        self.balance -= amount

class SavingsAccount(BankAccount):
    pass

savings_acct = SavingsAccount(1000)
type(savings_acct)          # __main__.SavingsAccount
savings_acct.balance        # 1000
```

<br>

#### Inheritance: The “is-a” Relationship

```python
savings_acct = SavingsAccount(1000)
isinstance(savings_acct, SavingsAccount)   # True

acct = BankAccount(500)
isinstance(acct, SavingsAccount)           # False

isinstance(savings_acct, BankAccount)      # True
isinstance(acct, BankAccount)              # True
```

<br>

#### Customizing Constructors

```python
class BankAccount:
    def __init__(self, balance):
        self.balance = balance
    def withdraw(self, amount):
        self.balance -= amount

class SavingsAccount(BankAccount):
    def __init__(self, balance, interest_rate):
        BankAccount.__init__(self, balance)
        self.interest_rate = interest_rate

acct = SavingsAccount(1000, 0.03)
acct.interest_rate          # 0.03
```

Reuse the parent’s initialization logic, then add new attributes.

<br>

#### Customizing Functionality

```python
class CheckingAccount(BankAccount):
    def __init__(self, balance, limit):
        BankAccount.__init__(self, balance)
        self.limit = limit

    def deposit(self, amount):
        self.balance += amount

    def withdraw(self, amount, fee=0):
        if fee <= self.limit:
            BankAccount.withdraw(self, amount - fee)
        else:
            BankAccount.withdraw(self, amount - self.limit)
```

Override parent methods to extend behavior while still using the shared logic.

<br>

#### Object Equality

```python
class Customer:
    def __init__(self, name, balance):
        self.name, self.balance = name, balance

customer1 = Customer("Maryam Azar", 3000)
customer2 = Customer("Maryam Azar", 3000)

customer1 == customer2      # False
```

Even though the data matches, the objects live at different memory addresses. (Compare this to NumPy arrays:)

```python
import numpy as np
arr1 = np.array([1, 2, 3])
arr2 = np.array([1, 2, 3])

arr1 == arr2                # array([ True,  True,  True])
```

<br>

#### Overloading `__eq__()`

```python
class Customer:
    def __init__(self, id, name):
        self.id, self.name = id, name

    def __eq__(self, other):
        print("__eq__() is called")
        return (self.id == other.id) and (self.name == other.name)

customer1 = Customer(123, "Maryam Azar")
customer2 = Customer(123, "Maryam Azar")

customer1 == customer2
# Output:
# __eq__() is called
# True
```

`__eq__()` runs when you compare two objects; by convention its parameters are `self` and `other`, and it should return a Boolean.

Other comparison hooks:

| Operator | Method      |
| -------- | ----------- |
| `==`     | `__eq__()`  |
| `!=`     | `__ne__()`  |
| `>=`     | `__ge__()`  |
| `<=`     | `__le__()`  |
| `>`      | `__gt__()`  |
| `<`      | `__lt__()`  |

`__hash__()` lets objects act as dictionary keys or set members.

<br>

#### Printing an Object

```python
class Customer:
    def __init__(self, name, balance):
        self.name, self.balance = name, balance

cust = Customer("Maryam Azar", 3000)
print(cust)
# Output: <__main__.Customer object at 0x...>

import numpy as np
arr = np.array([1, 2, 3])
print(arr)
# Output: [1 2 3]
```

NumPy provides human-friendly output; our class just prints the memory address.

`__str__()` handles `print(obj)` / `str(obj)`:

```python
class Customer:
    def __init__(self, name, balance):
        self.name, self.balance = name, balance

    def __str__(self):
        cust_str = """
        Customer:
            name: {name}
            balance: {balance}
        """.format(name=self.name, balance=self.balance)
        return cust_str

cust = Customer("Maryam Azar", 3000)
print(cust)
```

`__repr__()` handles `repr(obj)` and console echoes:

```python
class Customer:
    def __init__(self, name, balance):
        self.name, self.balance = name, balance

    def __repr__(self):
        return "Customer('{name}', {balance})".format(
            name=self.name,
            balance=self.balance,
        )

cust = Customer("Maryam Azar", 3000)
cust
# Output: Customer('Maryam Azar', 3000)
```

By convention `repr` should return a string that could recreate the object.

<br>

#### Exceptions

Use the `try`-`except`-`finally` pattern:

```python
try:
    # attempt some code
except ExceptionNameHere:
    # handle the specific exception
finally:
    # run no matter what
```

<br>

#### Raising Exceptions

```python
def make_list_of_ones(length):
    if length <= 0:
        raise ValueError("Invalid length!")
    return [1] * length

make_list_of_ones(-1)
# Raises: ValueError("Invalid length!")
```

Raising explicit exceptions gives users a clear signal something went wrong.

<br>

#### Custom Exceptions

```python
class BalanceError(Exception):
    pass

class Customer:
    def __init__(self, name, balance):
        if balance < 0:
            raise BalanceError("Balance has to be non-negative!")
        else:
            self.name, self.balance = name, balance

cust = Customer("Larry Torres", -100)
# Raises: BalanceError("Balance has to be non-negative!")
```

<br>

#### Best Practices of Class Design

Polymorphism allows a unified interface to operate across different classes.

```python
def batch_withdraw(list_of_accounts, amount):
    for acct in list_of_accounts:
        acct.withdraw(amount)

b = BankAccount(1000)
c = CheckingAccount(2000)
s = SavingsAccount(3000)
batch_withdraw([b, c, s])
```

The helper doesn’t need to know which account type it’s dealing with—as long as each class provides a compatible `withdraw` method.

<br>

#### Liskov Substitution Principle (LSP)

A foundational OO design rule:

- You should be able to replace a base class instance with any subclass instance without breaking your program.
- **Syntactic** requirement: subclasses must accept compatible parameters and return compatible values.
- **Semantic** requirement: subclasses should maintain consistent state, not strengthen preconditions, weaken postconditions, or introduce additional exceptions.

Examples of LSP violations:

- `BankAccount.withdraw()` expects one argument while `CheckingAccount.withdraw()` requires two (unless the extra parameter has a default).
- The base class allows any amount, but the subclass arbitrarily rejects certain amounts.
