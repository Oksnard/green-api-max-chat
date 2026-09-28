type Props = {
  onNewChat: () => void;
};

export function EmptyState({ onNewChat }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[14px] text-ink-2">Выберите чат слева или создайте новый</p>
      <button
        type="button"
        onClick={onNewChat}
        className="accent-gradient rounded-full px-4 py-2 text-[13px] font-semibold text-white"
      >
        Создать первый чат
      </button>
    </div>
  );
}
