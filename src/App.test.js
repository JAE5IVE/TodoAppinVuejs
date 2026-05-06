import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.vue';

const STORAGE_KEY = 'todoflow_tasks';
const THEME_KEY = 'todoflow_theme';

function mountApp() {
  const host = document.createElement('div');
  document.body.appendChild(host);

  return mount(App, {
    attachTo: host,
    global: {
      stubs: {
        Teleport: true,
      },
    },
  });
}

function seedTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function findButton(wrapper, text) {
  return wrapper
    .findAll('button')
    .find((button) => button.text().toLowerCase().includes(text.toLowerCase()));
}

function findCategoryChoice(wrapper, text) {
  return wrapper
    .findAll('.category-choice')
    .find((button) => button.text().toLowerCase().includes(text.toLowerCase()));
}

async function createTask(wrapper, title, category = 'work', dueDate = '') {
  await findButton(wrapper, 'Create New').trigger('click');
  await wrapper.find('input[placeholder="Task description..."]').setValue(title);

  if (category !== 'work') {
    await findCategoryChoice(wrapper, category).trigger('click');
  }

  if (dueDate) {
    await wrapper.find('input[type="date"]').setValue(dueDate);
  }

  await findButton(wrapper, 'Launch Task').trigger('click');
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches: false })),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TodoFlow Vue app', () => {
  it('adds a task with a category and due date', async () => {
    const wrapper = mountApp();

    await createTask(wrapper, 'Ship portfolio update', 'urgent', '2026-06-15');

    expect(wrapper.text()).toContain('Ship portfolio update');
    expect(wrapper.text()).toContain('urgent');
    expect(wrapper.text()).toContain('Jun 15, 2026');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(1);
  });

  it('edits an existing task', async () => {
    seedTasks([
      {
        id: 'task-1',
        text: 'Draft README',
        completed: false,
        category: 'work',
        dueDate: '',
        createdAt: Date.UTC(2026, 4, 6),
        updatedAt: Date.UTC(2026, 4, 6),
      },
    ]);
    const wrapper = mountApp();

    await wrapper.find('button[aria-label="Edit task"]').trigger('click');
    await wrapper.find('input[placeholder="Task description..."]').setValue('Polish README');
    await findCategoryChoice(wrapper, 'personal').trigger('click');
    await wrapper.find('input[type="date"]').setValue('2026-07-01');
    await findButton(wrapper, 'Save Changes').trigger('click');

    expect(wrapper.text()).toContain('Polish README');
    expect(wrapper.text()).toContain('personal');
    expect(wrapper.text()).toContain('Jul 1, 2026');
    expect(wrapper.text()).not.toContain('Draft README');
  });

  it('completes and deletes a task', async () => {
    seedTasks([
      {
        id: 'task-1',
        text: 'Finish tests',
        completed: false,
        category: 'work',
        dueDate: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    const wrapper = mountApp();

    await wrapper.find('button[aria-label="Mark as complete"]').trigger('click');
    expect(wrapper.find('.task-card').classes()).toContain('completed');

    await wrapper.find('button[aria-label="Delete task"]').trigger('click');
    expect(wrapper.text()).not.toContain('Finish tests');
    expect(wrapper.text()).toContain('Nothing here yet');
  });

  it('filters tasks by search text and category', async () => {
    seedTasks([
      {
        id: 'task-1',
        text: 'Buy groceries',
        completed: false,
        category: 'shopping',
        dueDate: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'task-2',
        text: 'Write proposal',
        completed: false,
        category: 'work',
        dueDate: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    const wrapper = mountApp();

    await wrapper.find('input[placeholder="Quick search tasks..."]').setValue('buy');
    expect(wrapper.text()).toContain('Buy groceries');
    expect(wrapper.text()).not.toContain('Write proposal');

    await wrapper.find('input[placeholder="Quick search tasks..."]').setValue('');
    await findButton(wrapper, 'work').trigger('click');
    expect(wrapper.text()).toContain('Write proposal');
    expect(wrapper.text()).not.toContain('Buy groceries');
  });

  it('exports and clears saved tasks', async () => {
    seedTasks([
      {
        id: 'task-1',
        text: 'Archive tasks',
        completed: false,
        category: 'work',
        dueDate: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    const wrapper = mountApp();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tasks');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await findButton(wrapper, 'Export Tasks').trigger('click');
    expect(clickSpy).toHaveBeenCalled();

    await findButton(wrapper, 'Clear All').trigger('click');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual([]);
    expect(wrapper.text()).toContain('Nothing here yet');
  });

  it('persists dark mode preference', async () => {
    const wrapper = mountApp();

    await wrapper.find('button[aria-label="Switch to dark mode"]').trigger('click');

    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
