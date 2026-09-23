"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Shield, Plus, Trash2, Save, X, Database } from "lucide-react";
import { motion } from "framer-motion";

const MODULES: { key: string; label: string }[] = [
  { key: "HR", label: "人事" },
  { key: "ORG", label: "组织" },
  { key: "FINANCE", label: "财务" },
  { key: "WORKFLOW", label: "流程" },
  { key: "MONITOR", label: "预警" },
  { key: "KNOWLEDGE", label: "知识库" },
  { key: "MESSAGES", label: "消息" },
  { key: "SYSTEM", label: "系统" },
];

interface PermissionRow { module: string; action: string; dimensionCode: string | null }
interface Role {
  id: string; name: string; description: string | null;
  memberCount: number; permissions: PermissionRow[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [draftPerms, setDraftPerms] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/system/roles');
    const data = await res.json();
    if (res.ok) setRoles(Array.isArray(data.roles) ? data.roles : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (role: Role) => {
    setEditing(role);
    const map: Record<string, string> = {};
    for (const p of role.permissions) map[p.module] = p.action;
    setDraftPerms(map);
    setNotice(null);
  };

  const toggleAction = (module: string, action: string) => {
    setDraftPerms((prev) => {
      const current = prev[module];
      const order = ['READ', 'WRITE', 'ADMIN'];
      if (current === action) return { ...prev, [module]: '' };
      // 点击低权限自动清除更高权限，点击高权限自动带上所有低权限
      const next: Record<string, string> = { ...prev };
      for (const a of order) {
        if (a === action) next[module] = action;
        else if (order.indexOf(a) < order.indexOf(action) && next[module] === a) next[module] = action;
      }
      return next;
    });
  };

  const savePerms = async () => {
    if (!editing) return;
    setNotice(null);
    const permissions = Object.entries(draftPerms)
      .filter(([, action]) => action)
      .map(([module, action]) => ({ module, action }));
    const res = await fetch(`/api/system/roles/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions }),
    });
    const data = await res.json();
    if (!res.ok) setNotice({ kind: 'err', text: data.error || '保存失败' });
    else {
      setNotice({ kind: 'ok', text: `「${editing.name}」权限已更新` });
      setEditing(null);
      load();
    }
  };

  const createRole = async () => {
    setNotice(null);
    const res = await fetch('/api/system/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: '自定义角色' }),
    });
    const data = await res.json();
    if (!res.ok) setNotice({ kind: 'err', text: data.error || '创建失败' });
    else {
      setNotice({ kind: 'ok', text: `已创建角色「${data.name}」` });
      setCreating(false);
      setNewName('');
      load();
    }
  };

  const removeRole = async (role: Role) => {
    if (!confirm(`确认删除角色「${role.name}」？`)) return;
    setNotice(null);
    const res = await fetch(`/api/system/roles/${role.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) setNotice({ kind: 'err', text: data.error || '删除失败' });
    else { setNotice({ kind: 'ok', text: '已删除' }); load(); }
  };

  const tableCell = (module: string, perms: PermissionRow[]) => {
    const action = perms.find((p) => p.module === module)?.action ?? '';
    const order = ['READ', 'WRITE', 'ADMIN'] as const;
    return (
      <td className="p-2 border-r border-gray-100">
        <div className="flex flex-col gap-1 justify-center items-start">
          {order.map((a) => (
            <label key={a} className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={action === a}
                disabled={editing === null}
                onChange={() => toggleAction(module, a)}
                className="accent-blue-600"
              />
              {a.toLowerCase()}
            </label>
          ))}
          <span className="text-[10px] text-blue-500 flex items-center gap-1 mt-0.5">
            <Database className="w-2.5 h-2.5" /> {action ? '维度: 全公司' : '无数据权限'}
          </span>
        </div>
      </td>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            系统权限与角色设置
          </h1>
          <p className="text-gray-500 mt-2">双维权限矩阵：功能模块 × 操作级别（READ / WRITE / ADMIN），当前数据维度固定为全公司。</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">
          <Plus className="w-4 h-4" /> 新建角色
        </button>
      </div>

      {notice && (
        <div className={`mb-4 text-sm px-4 py-2.5 rounded-lg border ${notice.kind === 'ok' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
          {notice.text}
        </div>
      )}

      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
            {roles.map((role, idx) => (
              <motion.div key={role.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-5 h-5 ${role.name === '系统管理员' ? 'text-blue-500' : 'text-purple-500'}`} />
                    <h3 className="font-bold text-gray-900">{role.name}</h3>
                  </div>
                  {role.name !== '系统管理员' && (
                    <button onClick={() => removeRole(role)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{role.description || '自定义角色'}</p>
                <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                  <span className="text-xs text-gray-500">{role.memberCount} 名成员绑定</span>
                  {role.name === '系统管理员'
                    ? <span className="text-xs text-blue-600">内置 · 全模块</span>
                    : <button onClick={() => openEdit(role)} className="text-blue-600 text-xs hover:underline">编辑权限</button>}
                </div>
              </motion.div>
            ))}
          </div>

          {creating && (
            <div className="border border-blue-200 rounded-xl p-5 bg-blue-50/30">
              <div className="flex items-center gap-3">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新角色名称"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={createRole} disabled={!newName.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
                  创建
                </button>
                <button onClick={() => setCreating(false)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {editing && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600" /> 编辑「{editing.name}」权限矩阵
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-white">取消</button>
                  <button onClick={savePerms} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                    <Save className="w-3 h-3" /> 保存
                  </button>
                </div>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="p-3 border-r w-40">功能模块</th>
                    {MODULES.map((m) => <th key={m.key} className="p-3 border-r text-xs font-medium">{m.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="p-3 border-r text-xs text-gray-400">操作级别（勾选最高权限即可，实现自动继承）</td>
                    {MODULES.map((m) => tableCell(m.key, editing.permissions))}
                  </tr>
                </tbody>
              </table>
              <div className="px-4 py-2 text-[11px] text-gray-400 bg-gray-50">
                权限继承：ADMIN 包含 WRITE 与 READ；WRITE 包含 READ。「系统管理员」为内置全模块角色，已锁定不可编辑。
              </div>
            </div>
          )}

          {!editing && roles.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              提示：点击角色卡片上的「编辑权限」调整模块权限；角色成员在「花名册管理 → 员工详情」中绑定。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}