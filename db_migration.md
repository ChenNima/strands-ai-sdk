# How to Get Started with Alembic and SQLModel | by Kasper Junge | Medium

![Kasper Junge](https://miro.medium.com/v2/resize:fill:64:64/1*e3LZyMBITrOE9g3uXeCQaw.jpeg)
[Kasper Junge](https://medium.com/@kasperjuunge)

Press enter or click to view image in full size

Alembic and SQLModel are powerful tools in the Python ecosystem for database management and ORM (Object Relational Mapping). This post will guide you through setting up Alembic with SQLModel, offering a streamlined approach to manage database migrations and interactions efficiently.

Step 1: Setting Up Your Environment
-----------------------------------

Before diving into Alembic and SQLModel, ensure your Python environment is set up. Create a new virtual environment and install SQLModel and Alembic.

```
python -m venv venv
source venv/bin/activate
pip install sqlmodel alembic
```


Step 2: Defining Your SQLModel Models
-------------------------------------

SQLModel allows you to define your database models using Python classes. Here’s a simple example:

```
from sqlmodel import SQLModel, Field
class Book(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    title: str
    author: str
```


This code defines a `Book` model with `id`, `title`, and `author` fields.

Step 3: Integrating Alembic for Database Migrations
---------------------------------------------------

Alembic is used for handling database migrations. Initialize Alembic in your project directory.

```
alembic init migrations
```


After initializing Alembic in your project directory, the next step is to configure the database URL in the `alembic.ini` file. This ensures Alembic connects to the correct database. Open `alembic.ini` and update the `sqlalchemy.url` line with your database connection string:

```
sqlalchemy.url = sqlite:///database.db
```


Next, modify the `env.py` file in the migrations directory to include your SQLModel models.

```
from sqlmodel import SQLModel
from alembic import context
from models import *  # Import your SQLModel models here
target_metadata = SQLModel.metadata
```


Next, you need to modify the `script.py.mako` file, which is the template for generating migration scripts. Open `script.py.mako` in the Alembic `versions` folder and add the following import at the top:

```
import sqlmodel
```


This import statement ensures that SQLModel is available in the migration environment.

Step 4: Creating and Running Migrations
---------------------------------------

To create a new migration after modifying your models, run:

```
alembic revision --autogenerate -m "Added book table"
```


This command creates a new migration file with the necessary changes. To apply the migration to your database, use:

```
alembic upgrade head
```


Step 5: Testing Your Setup
--------------------------

Test your setup to ensure everything is working correctly. Create a simple script to add a book to your database.

```
from sqlmodel import Session, create_engine
from models import Book
engine = create_engine('sqlite:///database.db')
SQLModel.metadata.create_all(engine)
with Session(engine) as session:
    book = Book(title="Sample Book", author="Author Name")
    session.add(book)
    session.commit()
```


This script creates a new book entry in your database.