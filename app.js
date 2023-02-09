const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initializeDbAndServer();

const hasTodoQuery = (requestQuery) => {
  return requestQuery.todo !== undefined;
};

const hasDuedateQuery = (requestQuery) => {
  return requestQuery.dueDate !== undefined;
};

const hasStatusQuery = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryQuery = (requestQuery) => {
  return requestQuery.category !== undefined;
};
const hasPriorityQuery = (requestQuery) => {
  return requestQuery.priority !== undefined;
};
const hasPriorityAndStatus = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndStatus = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriority = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};
const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
const categoryArray = ["WORK", "HOME", "LEARNING"];
const priorityArray = ["HIGH", "MEDIUM", "LOW"];

const validityCheckForGet = (request, response, next) => {
  const todoDetails = request.query;
  if (todoDetails.status !== undefined) {
    const isValidStatus = statusArray.includes(todoDetails.status);
    if (isValidStatus === false) {
      response.status(400);
      response.send("Invalid Todo Status");
    } else {
      next();
    }
  } else if (todoDetails.category !== undefined) {
    const isValidCategory = categoryArray.includes(todoDetails.category);
    if (isValidCategory === false) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else {
      next();
    }
  } else if (todoDetails.priority !== undefined) {
    const isValidPriority = priorityArray.includes(todoDetails.priority);
    if (isValidPriority === false) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else {
      next();
    }
  } else if (todoDetails.date !== undefined) {
    const formattedDate = format(new Date(todoDetails.date), "yyyy-MM-dd");
    const updatedDate = new Date(formattedDate);
    const isValidDate = isValid(updatedDate);
    if (isValidDate !== true) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      next();
    }
  } else {
    next();
  }
};

const validityCheck = (request, response, next) => {
  const todoDetails = request.body;

  const isValidStatus = statusArray.includes(todoDetails.status);
  if (isValidStatus === true) {
    const isValidCategory = categoryArray.includes(todoDetails.category);
    if (isValidCategory === true) {
      const isValidPriority = priorityArray.includes(todoDetails.priority);
      if (isValidPriority === true) {
        const formattedDate = format(
          new Date(todoDetails.dueDate),
          "yyyy-MM-dd"
        );
        const updatedDate = new Date(formattedDate);
        const isValidDate = isValid(updatedDate);
        if (isValidDate === true) {
          next();
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Status");
  }
};

app.get("/todos/", validityCheckForGet, async (request, response) => {
  const { search_q = "", category, priority, status } = request.query;
  let text;
  let getTodosQuery;
  switch (true) {
    case hasPriorityAndStatus(request.query):
      getTodosQuery = `
            SELECT * 
            FROM 
                todo 
            WHERE 
                priority = "${priority}"
                AND status = "${status}"
            ORDER BY 
                id;
            `;

      break;
    case hasCategoryAndStatus(request.query):
      getTodosQuery = `
            SELECT 
                * 
            FROM 
                todo
            WHERE 
                category = "${category}"
                AND status = "${status}"
            ORDER BY 
                id;`;
      break;
    case hasCategoryAndPriority(request.query):
      getTodosQuery = `
                SELECT 
                    * 
                FROM 
                    todo
                WHERE 
                    category = "${category}"
                    AND priority = "${priority}"
                ORDER BY 
                    id;`;
      break;
    case hasStatusQuery(request.query):
      getTodosQuery = `
                SELECT 
                    * 
                FROM 
                    todo
                WHERE 
                    status = "${status}"
                ORDER BY 
                    id;`;
      text = "Status";
      break;
    case hasPriorityQuery(request.query):
      getTodosQuery = `
                SELECT 
                    * 
                FROM 
                    todo
                WHERE 
                    priority = "${priority}"
                ORDER BY 
                    id;`;
      text = "Priority";
      break;

    case hasCategoryQuery(request.query):
      getTodosQuery = `
                SELECT 
                    * 
                FROM 
                    todo
                WHERE 
                    category = "${category}"
                ORDER BY 
                    id;`;
      text = "Category";
      break;
    default:
      getTodosQuery = `
                SELECT 
                    * 
                FROM 
                    todo
                WHERE 
                    todo LIKE "%${search_q}%"
                ORDER BY 
                    id;`;
      break;
  }
  const dbResponse = await db.all(getTodosQuery);
  if (dbResponse === undefined) {
    response.status(400);
    response.send(`Invalid Todo ${text}`);
  } else {
    response.send(dbResponse);
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        SELECT
            *
        FROM todo
        WHERE 
            id = "${todoId}";`;
  const todo = await db.get(getTodoQuery);
  response.send(todo);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const formattedDate = format(new Date(date), "yyyy-MM-dd");
  const updatedDate = new Date(formattedDate);
  const isValidDate = await isValid(updatedDate);

  if (isValidDate === true) {
    const getTodosDateQuery = `
        SELECT  
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate
        FROM 
            todo
        WHERE
            due_date = "${formattedDate}"
        ORDER BY
            id;`;
    const todoArray = await db.all(getTodosDateQuery);
    if (todoArray !== undefined) {
      response.send(todoArray);
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", validityCheck, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const addTodoQuery = `
        INSERT INTO 
            todo(id,todo,priority,status,category,due_date)
        VALUES 
            ("${id}","${todo}","${priority}","${status}","${category}","${dueDate}");`;
  const dbResponse = await db.run(addTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { todo, priority, status, category, dueDate } = request.body;
  let updateTodoQuery;
  let text;

  switch (true) {
    case hasTodoQuery(request.body):
      updateTodoQuery = `
                UPDATE 
                    todo
                SET 
                    todo="${todo}"
                WHERE 
                    id = "${todoId}"; `;
      text = "Todo Updated";
      break;
    case hasStatusQuery(request.body):
      updateTodoQuery = `
                UPDATE 
                    todo
                SET 
                    status="${status}"
                WHERE 
                    id = "${todoId}"; `;
      text = "Status Updated";
      break;
    case hasPriorityQuery(request.body):
      updateTodoQuery = `
                UPDATE 
                    todo
                SET 
                    priority="${priority}"
                WHERE 
                    id = "${todoId}"; `;
      text = "Priority Updated";
      break;
    case hasCategoryQuery(request.body):
      updateTodoQuery = `
                UPDATE 
                    todo
                SET 
                    category="${category}"
                WHERE 
                    id = "${todoId}"; `;
      text = "Category Updated";
      break;
    case hasDuedateQuery(request.body):
      updateTodoQuery = `
                UPDATE 
                    todo
                SET 
                    due_date="${dueDate}"
                WHERE 
                    id = "${todoId}"; `;
      text = "Due Date Updated";
      break;
  }
  const dbResponse = await db.run(updateTodoQuery);
  response.send(text);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        DELETE FROM 
            todo
        WHERE 
            id = "${todoId}";`;
  const dbResponse = await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
module.exports = app;
