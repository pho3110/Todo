import { useEffect, useState } from "react";

function App() {
  // Các state
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("todo-tasks");
      if (savedTasks === null) return [];
      const parsedTasks = JSON.parse(savedTasks);
      if (!Array.isArray(parsedTasks)) return [];
      const seenIds = new Set();
      return parsedTasks.filter((task) => {
        if (
          task === null ||
          typeof task !== "object" ||
          Array.isArray(task) ||
          !(
            (typeof task.id === "string" && task.id.trim() !== "") ||
            (typeof task.id === "number" && Number.isFinite(task.id))
          ) ||
          typeof task.title !== "string" ||
          task.title.trim() === "" ||
          typeof task.done !== "boolean"
        ) {
          return false;
        }

        const key = String(task.id);
        if (seenIds.has(key)) return false;
        seenIds.add(key);
        return true;
      });
    } catch (error) {
      console.error("Không thể đọc dữ liệu công việc:", error);
      return [];
    }
  });

  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState("all");

  // Effect
  useEffect(() => {
    try {
      localStorage.setItem("todo-tasks", JSON.stringify(tasks));
    } catch (error) {
      console.error("Không thể lưu công việc. Dữ liệu có thể mất khi tải lại trang:", error);
    }
  }, [tasks]);

  // Dữ liệu tính toán
  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return !task.done;
    if (filter === "done") return task.done;
    return true;
  });
  const remainingCount = tasks.filter((task) => !task.done).length;

  // Hàm xử lý
  const handleAdd = (e) => {
    e.preventDefault();
    const trimedTitle = title.trim();
    if (trimedTitle === "") return;
    const newTask = {
      id: crypto.randomUUID(),
      title: trimedTitle,
      done: false,
    };
    setTasks((currentTasks) => [...currentTasks, newTask]);
    setTitle("");
  };

  const handleToggle = (id) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id === id) {
          return { ...task, done: !task.done };
        }
        return task;
      }),
    );
  };

  const handleDelete = (id) => {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
  };

  // Giao diện
  return (
    <div role="main">
      <h1>Ứng dụng quản lý công việc</h1>
      <p>Còn {remainingCount} công việc chưa hoàn thành</p>
      <form onSubmit={handleAdd}>
        <input
          aria-label="Tên công việc mới"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nhập công việc..."
        />
        <button type="submit">Thêm</button>
      </form>
      <div>
        <button onClick={() => setFilter("all")} disabled={filter === "all"}>
          Tất cả
        </button>
        <button
          onClick={() => setFilter("active")}
          disabled={filter === "active"}
        >
          Chưa xong
        </button>
        <button onClick={() => setFilter("done")} disabled={filter === "done"}>
          Đã xong
        </button>
      </div>
      {filteredTasks.length === 0 && <p>Không có công việc phù hợp</p>}
      <ul>
        {filteredTasks.map((task) => (
          <li key={task.id}>
            {task.title}
            <button onClick={() => handleToggle(task.id)}>
              {task.done ? "Đánh dấu chưa xong" : "Hoàn thành"}
            </button>
            <button onClick={() => handleDelete(task.id)}>Xóa</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
