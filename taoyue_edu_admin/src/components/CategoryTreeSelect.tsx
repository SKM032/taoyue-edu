import { useEffect, useMemo, useRef, useState } from 'react';

interface CategoryNode {
  id: number | string;
  name: string;
  icon?: string;
  children?: CategoryNode[];
  parent_id?: number | null;
}

interface Props {
  categories: CategoryNode[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

interface FlatItem {
  id: number;
  name: string;
  icon?: string;
  parent_id: number | null;
  depth: number;
  hasChildren: boolean;
}

// 带 _children 字段的树节点类型（递归自身，用于扁平列表构建树）
type TreeNode = CategoryNode & { _children: TreeNode[] };

// 兼容两种数据格式：嵌套树（children） 或 扁平列表（parent_id）
function buildFlat(items: CategoryNode[]): FlatItem[] {
  const list: FlatItem[] = [];

  // 先尝试按嵌套树展开
  const hasNested = items.some((c) => Array.isArray(c.children) && c.children.length > 0);
  if (hasNested) {
    const walkNested = (nodes: CategoryNode[], depth: number, parentId: number | null) => {
      nodes.forEach((c) => {
        const children = c.children || [];
        list.push({
          id: Number(c.id),
          name: c.name,
          icon: c.icon,
          parent_id: parentId,
          depth,
          hasChildren: children.length > 0,
        });
        if (children.length) walkNested(children, depth + 1, Number(c.id));
      });
    };
    walkNested(items, 0, null);
  } else {
    // 扁平列表：按 parent_id 构建树
    const nodeMap = new Map<number, TreeNode>();
    items.forEach((c) => {
      nodeMap.set(Number(c.id), { ...c, _children: [] });
    });
    const roots: TreeNode[] = [];
    items.forEach((c) => {
      const node = nodeMap.get(Number(c.id))!;
      const pid = c.parent_id == null ? null : Number(c.parent_id);
      if (pid !== null && nodeMap.has(pid)) {
        nodeMap.get(pid)!._children.push(node);
      } else {
        roots.push(node);
      }
    });
    const walkFlat = (nodes: TreeNode[], depth: number, parentId: number | null) => {
      nodes.forEach((c) => {
        list.push({
          id: Number(c.id),
          name: c.name,
          icon: c.icon,
          parent_id: parentId,
          depth,
          hasChildren: c._children.length > 0,
        });
        if (c._children.length) walkFlat(c._children, depth + 1, Number(c.id));
      });
    };
    walkFlat(roots, 0, null);
  }

  return list;
}

export default function CategoryTreeSelect({ categories, value, onChange, placeholder = '请选择分类' }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const flatList = useMemo<FlatItem[]>(() => buildFlat(categories), [categories]);

  // 默认全部折叠
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // 点外面关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [open]);

  // 选中后调整展开状态：
//   - 选中子分类（depth>=1）→ 展开所有祖先，再次打开时能看到选中项所在路径
//   - 选中顶级分类（depth=0）→ 重置为全折叠，因为没有祖先需要展开
useEffect(() => {
  setExpanded(new Set());
  if (!value) return;
  const selected = flatList.find((i) => String(i.id) === value);
  if (!selected || selected.depth === 0) return;
  // 选中的是子分类，展开其祖先
  const ancestors = new Set<number>();
  let current = selected;
  while (current.parent_id !== null) {
    ancestors.add(current.parent_id);
    const parent = flatList.find((i) => i.id === current.parent_id);
    if (!parent) break;
    current = parent;
  }
  if (ancestors.size > 0) {
    setExpanded(ancestors);
  }
}, [value, flatList]);

  // 当分类数据变化时，重新初始化：全折叠（除非当前选中项存在则展开其祖先）
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set<number>();
      // 保留当前展开的项（如果仍然存在）——避免数据刷新时打断用户
      flatList.forEach((i) => {
        if (prev.has(i.id)) next.add(i.id);
      });
      return next;
    });
  }, [flatList]);

  const toggle = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItem = flatList.find((i) => String(i.id) === value);

  const handleSelect = (id: number) => {
    onChange(String(id));
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* 选择框 */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-left flex items-center justify-between transition-all ${
          open ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={`flex items-center gap-2 truncate ${selectedItem ? 'text-slate-700' : 'text-slate-400'}`}>
          {selectedItem?.icon && <span className="text-base">{selectedItem.icon}</span>}
          <span className="truncate">{selectedItem ? selectedItem.name : placeholder}</span>
        </span>
        <iconify-icon
          icon="lucide:chevron-down"
          class={`text-base text-slate-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        ></iconify-icon>
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
          {flatList.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">暂无分类数据</div>
          ) : (
            <div className="py-1">
              {flatList.map((item) => {
                // 判断当前行是否可见：所有祖先节点都已展开
                const shouldShow = (() => {
                  if (item.depth === 0) return true;
                  let pid = item.parent_id;
                  while (pid !== null) {
                    if (!expanded.has(pid)) return false;
                    const parent = flatList.find((i) => i.id === pid);
                    if (!parent) break;
                    pid = parent.parent_id;
                  }
                  return true;
                })();

                if (!shouldShow) return null;

                const isOpen = expanded.has(item.id);
                const isSelected = String(item.id) === value;
                return (
                  <div
                    key={item.id}
                    style={{ paddingLeft: `${8 + item.depth * 20}px`, paddingRight: '8px' }}
                    onClick={() => {
                      // 点击 chevron 区域不触发选中
                      if (item.hasChildren) toggle(item.id);
                      else handleSelect(item.id);
                    }}
                    className={`flex items-center gap-2 py-1.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* 折叠图标（点击切换展开/折叠） */}
                    {item.hasChildren ? (
                      <span
                        onClick={(e) => toggle(item.id, e)}
                        className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-pointer"
                      >
                        <iconify-icon
                          icon="lucide:chevron-down"
                          class={`text-xs transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                        ></iconify-icon>
                      </span>
                    ) : (
                      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      </span>
                    )}

                    {/* 图标 */}
                    {item.icon && <span className="text-base flex-shrink-0">{item.icon}</span>}

                    {/* 名称 */}
                    <span className={`flex-1 text-sm truncate ${isSelected ? 'text-indigo-600 font-medium' : 'text-slate-700'}`}>
                      {item.name}
                    </span>

                    {/* 单选框 */}
                    <span
                      onClick={(e) => { e.stopPropagation(); handleSelect(item.id); }}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                        isSelected ? 'border-indigo-500' : 'border-gray-300 hover:border-indigo-300'
                      }`}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}