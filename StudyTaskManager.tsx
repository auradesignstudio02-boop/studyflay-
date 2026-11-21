import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react';

export interface StudyTask {
  id: string;
  title: string;
  period: 'daily' | 'weekly' | 'monthly';
  completed: boolean;
  category: string;
  estimatedMinutes: number;
  createdAt: string;
}

interface StudyTaskManagerProps {
  tasks: StudyTask[];
  onAddTask: (task: Omit<StudyTask, 'id' | 'completed' | 'createdAt'>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onStartTaskFlight: (taskTitle: string, minutes: number) => void;
}

const CATEGORIES = ['مذاكرة ودرس', 'حل تمارين', 'مراجعة شاملة', 'قراءة كتاب', 'بحث علمي'];

export const StudyTaskManager: React.FC<StudyTaskManagerProps> = ({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onStartTaskFlight,
}) => {
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [titleInput, setTitleInput] = useState('');
  const [categoryInput, setCategoryInput] = useState(CATEGORIES[0]);
  const [minutesInput, setMinutesInput] = useState(45);

  const filteredTasks = tasks.filter((t) => t.period === activePeriod);
  const completedCount = filteredTasks.filter((t) => t.completed).length;
  const totalCount = filteredTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;
    onAddTask({
      title: titleInput.trim(),
      period: activePeriod,
      category: categoryInput,
      estimatedMinutes: Number(minutesInput) || 30,
    });
    setTitleInput('');
  };

  const getPeriodLabel = (p: 'daily' | 'weekly' | 'monthly') => {
    if (p === 'daily') return 'اليومية';
    if (p === 'weekly') return 'الأسبوعية';
    return 'الشهرية';
  };

  return (
    <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* Header & Motivational Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
            <Target className="w-4 h-4" />
            <span>محطة مهام الطيران الدراسي</span>
          </div>
          <h2 className="text-xl font-bold text-white">جدول مهام المذاكرة الذكي</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            نظم مهامك اليومية والأسبوعية والشهرية واربطها مباشرة برحلات التركيز الجوية لضمان التفوق.
          </p>
        </div>

        {/* Motivational Streak / Completion Badge */}
        <div className="bg-[#0A101F] border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">إنجاز {getPeriodLabel(activePeriod)}</div>
            <div className="text-sm font-bold font-mono-tabular text-white">
              {completedCount} من {totalCount} مهام ({progressPercent}%)
            </div>
          </div>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-[#0A101F] border border-slate-800 rounded-xl">
        {(['daily', 'weekly', 'monthly'] as const).map((period) => {
          const active = activePeriod === period;
          const count = tasks.filter((t) => t.period === period).length;
          const done = tasks.filter((t) => t.period === period && t.completed).length;

          return (
            <button
              key={period}
              type="button"
              onClick={() => setActivePeriod(period)}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                active
                  ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>مهام {getPeriodLabel(period)}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                {done}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleSubmit} className="bg-[#0A101F] border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>إضافة مهمة جديدة لجدول {getPeriodLabel(activePeriod)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="اكتب عنوان المهمة الدراسية (مثال: حل 20 مسألة تفاضل)..."
            className="sm:col-span-6 bg-[#111A2E] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
          />

          <select
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            className="sm:col-span-3 bg-[#111A2E] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="sm:col-span-3 flex items-center gap-2">
            <select
              value={minutesInput}
              onChange={(e) => setMinutesInput(Number(e.target.value))}
              className="flex-1 bg-[#111A2E] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value={15}>15 دقيقة</option>
              <option value={25}>25 دقيقة (بومودورو)</option>
              <option value={45}>45 دقيقة</option>
              <option value={60}>ساعة كاملة</option>
              <option value={90}>ساعة ونصف</option>
            </select>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
            </button>
          </div>
        </div>
      </form>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-[#0A101F] border border-slate-800/80 rounded-xl p-8 text-center space-y-2">
            <Target className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-300">لا توجد مهام مسجلة في هذه القائمة حالياً</div>
            <p className="text-xs text-slate-500">أضف مهمتك الدراسية الأولى وابدأ رحلة الطيران لإنجازها.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`bg-[#0A101F] border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                task.completed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  aria-label="تحديد المهمة كمكتملة"
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0 ${
                    task.completed
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'border-slate-700 hover:border-sky-400 bg-[#111A2E]'
                  }`}
                >
                  {task.completed && <CheckCircle2 className="w-4 h-4" />}
                </button>

                <div className="space-y-1 min-w-0">
                  <div
                    className={`text-sm font-medium truncate ${
                      task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                    }`}
                  >
                    {task.title}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="text-sky-400 font-medium">{task.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {task.estimatedMinutes} دقيقة
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => onStartTaskFlight(task.title, task.estimatedMinutes)}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  طيران لهذه المهمة
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  aria-label="حذف المهمة"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
