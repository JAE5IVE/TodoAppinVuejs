<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  CheckCircle2,
  Download,
  Edit3,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  X,
} from 'lucide-vue-next';

const STORAGE_KEY = 'todoflow_tasks';
const THEME_KEY = 'todoflow_theme';
const ACCOUNT_KEY = 'todoflow_account';
const categories = ['work', 'personal', 'urgent', 'shopping', 'health'];

const todos = ref(loadTodos());
const account = ref(loadAccount());
const isLoggedIn = ref(Boolean(account.value));
const authMode = ref(account.value ? 'login' : 'register');
const notifications = ref([]);
const searchQuery = ref('');
const currentFilter = ref('all');
const showTaskForm = ref(false);
const editingTodoId = ref(null);
const taskInput = ref(null);
const taskForm = reactive({ text: '', category: 'work', dueDate: '' });
const authForm = reactive({ name: account.value?.name || '', email: account.value?.email || '' });
const theme = ref(loadTheme());

const username = computed(() => account.value?.name || 'there');
const userInitial = computed(() => username.value.trim().charAt(0).toUpperCase() || 'U');
const pendingCount = computed(() => todos.value.filter((todo) => !todo.completed).length);
const completedCount = computed(() => todos.value.filter((todo) => todo.completed).length);
const hasTasks = computed(() => todos.value.length > 0);
const isDarkMode = computed(() => theme.value === 'dark');
const formTitle = computed(() => (editingTodoId.value ? 'Edit Task' : 'New Task'));
const formSubmitLabel = computed(() => (editingTodoId.value ? 'Save Changes' : 'Launch Task'));
const filteredTodos = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return todos.value.filter((todo) => {
    const matchesSearch = !query || todo.text.toLowerCase().includes(query);
    const matchesFilter = currentFilter.value === 'all' || todo.category === currentFilter.value;
    return matchesSearch && matchesFilter;
  });
});

watch(
  todos,
  (nextTodos) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTodos));
  },
  { deep: true },
);

watch(showTaskForm, async (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : '';

  if (isOpen) {
    await nextTick();
    taskInput.value?.focus();
  }
});

watch(
  theme,
  (nextTheme) => {
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  },
  { immediate: true },
);

function loadAccount() {
  try {
    const saved = localStorage.getItem(ACCOUNT_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    return parsed?.name ? parsed : null;
  } catch (error) {
    console.error('Error loading account:', error);
    return null;
  }
}

function loadTodos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((todo) => ({
      ...todo,
      createdAt: todo.createdAt || Date.now(),
      updatedAt: todo.updatedAt || todo.createdAt || Date.now(),
      dueDate: todo.dueDate || '',
    }));
  } catch (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;

  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  return prefersDark ? 'dark' : 'light';
}

function addNotification(message) {
  const id = Date.now() + Math.random();
  notifications.value = [...notifications.value.slice(-2), { id, message }];

  window.setTimeout(() => {
    notifications.value = notifications.value.filter((notification) => notification.id !== id);
  }, 3000);
}

function resetTaskForm() {
  taskForm.text = '';
  taskForm.category = 'work';
  taskForm.dueDate = '';
  editingTodoId.value = null;
}

function openNewTaskForm() {
  resetTaskForm();
  showTaskForm.value = true;
}

function openEditTaskForm(todo) {
  editingTodoId.value = todo.id;
  taskForm.text = todo.text;
  taskForm.category = todo.category;
  taskForm.dueDate = todo.dueDate || '';
  showTaskForm.value = true;
}

function closeTaskForm() {
  showTaskForm.value = false;
}

function saveTodo() {
  const text = taskForm.text.trim();
  if (!text) return;

  if (editingTodoId.value) {
    todos.value = todos.value.map((todo) =>
      todo.id === editingTodoId.value
        ? {
            ...todo,
            text,
            category: taskForm.category,
            dueDate: taskForm.dueDate,
            updatedAt: Date.now(),
          }
        : todo,
    );
    addNotification('Task updated');
  } else {
    todos.value = [
      {
        id: Math.random().toString(36).slice(2, 11),
        text,
        completed: false,
        category: taskForm.category,
        dueDate: taskForm.dueDate,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ...todos.value,
    ];
    addNotification('Task added successfully');
  }

  closeTaskForm();
  resetTaskForm();
}

function toggleTodo(id) {
  todos.value = todos.value.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed, updatedAt: Date.now() } : todo,
  );
  addNotification('Task status updated');
}

function deleteTodo(id) {
  todos.value = todos.value.filter((todo) => todo.id !== id);
  addNotification('Task removed');
}

function clearAllTasks() {
  if (!hasTasks.value) return;
  const shouldClear = window.confirm('Clear every saved task? This cannot be undone.');
  if (!shouldClear) return;

  todos.value = [];
  addNotification('All tasks cleared');
}

function exportTasks() {
  const payload = {
    exportedAt: new Date().toISOString(),
    tasks: todos.value,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `todoflow-tasks-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  addNotification('Task export downloaded');
}

function toggleTheme() {
  theme.value = isDarkMode.value ? 'light' : 'dark';
}

function createAccount() {
  const name = authForm.name.trim();
  const email = authForm.email.trim();
  if (!name) return;

  const nextAccount = {
    name,
    email,
    createdAt: Date.now(),
  };

  account.value = nextAccount;
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(nextAccount));
  isLoggedIn.value = true;
  addNotification(`Welcome, ${name}`);
}

function signIn() {
  if (!account.value) {
    authMode.value = 'register';
    return;
  }

  isLoggedIn.value = true;
  addNotification(`Welcome back, ${account.value.name}`);
}

function signOut() {
  isLoggedIn.value = false;
  authMode.value = account.value ? 'login' : 'register';
}

function formatDate(timestamp) {
  if (!timestamp) return 'Not available';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function formatDueDate(value) {
  if (!value) return 'No due date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function handleEscape(event) {
  if (event.key === 'Escape' && showTaskForm.value) {
    closeTaskForm();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape);
});

onBeforeUnmount(() => {
  document.body.style.overflow = '';
  window.removeEventListener('keydown', handleEscape);
});
</script>

<template>
  <main v-if="!isLoggedIn" class="login-screen">
    <section class="login-card" aria-labelledby="login-title">
      <h1 id="login-title">TodoFlow</h1>
      <p>{{ account ? 'Sign in to continue managing your tasks' : 'Create an account to start managing your tasks' }}</p>

      <form v-if="authMode === 'register'" class="auth-form" @submit.prevent="createAccount">
        <label>
          <span class="field-label">Username</span>
          <input
            v-model="authForm.name"
            class="task-input"
            type="text"
            autocomplete="name"
            placeholder="Your username"
          />
        </label>
        <label>
          <span class="field-label">Email</span>
          <input
            v-model="authForm.email"
            class="task-input"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
          />
        </label>
        <button class="primary-button auth-submit" type="submit" :disabled="!authForm.name.trim()">
          Create Account
        </button>
        <button v-if="account" class="text-button" type="button" @click="authMode = 'login'">
          Already have an account? Sign in
        </button>
      </form>

      <div v-else class="auth-form">
        <p class="saved-account">
          {{ account.name }}
        </p>
        <button class="primary-button auth-submit" type="button" @click="signIn">
          Sign in
        </button>
        <button class="text-button" type="button" @click="authMode = 'register'">
          Create a different account
        </button>
      </div>
    </section>
  </main>

  <div v-else class="app-shell">
    <div class="notification-stack" aria-live="polite">
      <div v-for="notification in notifications" :key="notification.id" class="toast" role="status">
        {{ notification.message }}
      </div>
    </div>

    <nav class="topbar" aria-label="Primary navigation">
      <div class="topbar-inner">
        <div class="brand-row">
          <h1 class="brand">TodoFlow</h1>
        </div>

        <div class="topbar-actions">
          <button
            type="button"
            class="utility-button theme-button"
            :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme"
          >
            <Sun v-if="isDarkMode" :size="16" aria-hidden="true" />
            <Moon v-else :size="16" aria-hidden="true" />
          </button>

          <div class="divider" />

          <div class="profile-button">
            <div class="profile-copy">
              <p class="profile-name">{{ username }}</p>
            </div>
            <button
              type="button"
              class="avatar-button"
              aria-label="Sign out"
              @click="signOut"
            >
              <span aria-hidden="true">{{ userInitial }}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main id="content" class="content">
      <header class="page-header">
        <h2 class="greeting">
          Good morning,<br />
          {{ username }}!
        </h2>
        <div class="stats-row" aria-label="Task statistics">
          <span class="pill pill-blue">
            <span class="pulse-dot" aria-hidden="true" />
            {{ pendingCount }} Tasks Pending
          </span>
          <span class="pill pill-green">{{ completedCount }} Completed</span>
        </div>
      </header>

      <section class="action-row" aria-label="Task actions">
        <label class="search-shell">
          <span class="sr-only">Search tasks</span>
          <Search :size="18" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Quick search tasks..."
          />
        </label>
        <button type="button" class="primary-button" @click="openNewTaskForm">
          <Plus :size="18" aria-hidden="true" />
          Create New
        </button>
      </section>

      <section class="data-actions" aria-label="Saved task controls">
        <button type="button" class="secondary-button" :disabled="!hasTasks" @click="exportTasks">
          <Download :size="16" aria-hidden="true" />
          Export Tasks
        </button>
        <button type="button" class="danger-button" :disabled="!hasTasks" @click="clearAllTasks">
          <Trash2 :size="16" aria-hidden="true" />
          Clear All
        </button>
      </section>

      <section class="category-row" aria-label="Task categories">
        <button
          type="button"
          class="category-filter"
          :class="{ 'is-active': currentFilter === 'all' }"
          @click="currentFilter = 'all'"
        >
          All Categories
        </button>
        <button
          v-for="category in categories"
          :key="category"
          type="button"
          class="category-filter outline"
          :class="{ 'is-active': currentFilter === category }"
          @click="currentFilter = category"
        >
          {{ category }}
        </button>
      </section>

      <section aria-label="Tasks">
        <div v-if="filteredTodos.length === 0" class="empty-state">
          <div class="empty-icon">
            <Settings aria-hidden="true" />
          </div>
          <p>Nothing here yet</p>
        </div>

        <div v-else class="task-list">
          <article
            v-for="todo in filteredTodos"
            :key="todo.id"
            class="task-card"
            :class="{ completed: todo.completed }"
          >
            <div class="task-content">
              <button
                type="button"
                class="check-button"
                :class="{ checked: todo.completed }"
                :aria-label="todo.completed ? 'Mark as incomplete' : 'Mark as complete'"
                @click="toggleTodo(todo.id)"
              >
                <CheckCircle2 v-if="todo.completed" :size="14" aria-hidden="true" />
              </button>

              <div class="task-main">
                <div class="task-meta">
                  <span class="category-label">{{ todo.category }}</span>
                  <span class="meta-dot" aria-hidden="true" />
                  <span class="task-id font-mono">ID:{{ todo.id }}</span>
                </div>
                <h3 class="task-title" :class="{ done: todo.completed }">{{ todo.text }}</h3>
                <dl class="task-dates">
                  <div>
                    <dt>Created</dt>
                    <dd>{{ formatDate(todo.createdAt) }}</dd>
                  </div>
                  <div>
                    <dt>Due</dt>
                    <dd>{{ formatDueDate(todo.dueDate) }}</dd>
                  </div>
                </dl>
              </div>

              <div class="task-buttons">
                <button
                  type="button"
                  class="edit-button"
                  aria-label="Edit task"
                  @click="openEditTaskForm(todo)"
                >
                  <Edit3 :size="16" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="delete-button"
                  aria-label="Delete task"
                  @click="deleteTodo(todo.id)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <div
        v-if="showTaskForm"
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        @click.self="closeTaskForm"
      >
        <section class="modal-panel">
          <div class="modal-title-row">
            <h3 id="task-form-title">{{ formTitle }}</h3>
            <button type="button" class="icon-button" aria-label="Close modal" @click="closeTaskForm">
              <X :size="20" aria-hidden="true" />
            </button>
          </div>

          <form class="task-form" @submit.prevent="saveTodo">
            <label>
              <span class="field-label">Task Title</span>
              <input
                ref="taskInput"
                v-model="taskForm.text"
                type="text"
                class="task-input"
                placeholder="Task description..."
              />
            </label>

            <label>
              <span class="field-label">Due Date</span>
              <input v-model="taskForm.dueDate" type="date" class="task-input" />
            </label>

            <fieldset>
              <legend class="field-label">Category</legend>
              <div class="category-choice-grid">
                <button
                  v-for="category in categories"
                  :key="category"
                  type="button"
                  class="category-choice"
                  :class="{ 'is-active': taskForm.category === category }"
                  @click="taskForm.category = category"
                >
                  {{ category }}
                </button>
              </div>
            </fieldset>

            <button type="submit" class="primary-button" :disabled="!taskForm.text.trim()">
              {{ formSubmitLabel }}
            </button>
          </form>
        </section>
      </div>
    </Teleport>

    <footer class="footer font-mono">jae5ive incorporated</footer>
  </div>
</template>
