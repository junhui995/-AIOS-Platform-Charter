/* eslint-disable */
"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Save, Settings, FormInput, FileText, CheckCircle2 } from 'lucide-react';

interface FormField {
  id: string;
  type: string; // text, number, date, select
  label: string;
  required: boolean;
  options?: string[]; // for select
}

export default function FormTemplateBuilder() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<{ id?: string, name: string, code: string, fields: FormField[] } | null>(null);

  useEffect(() => {
     // Fetch existing templates on load
     fetch('/api/workflow/forms').then(res => res.json()).then(data => {
         if (Array.isArray(data)) setTemplates(data);
     }).catch(console.error);
  }, []);

  const createNew = () => {
     setActiveTemplate({ name: '新建审批表单', code: 'FORM_' + Date.now(), fields: [] });
  };

  const addField = (type: string) => {
     if (!activeTemplate) return;
     const newField: FormField = {
        id: 'field_' + Date.now(),
        type,
        label: '新字段',
        required: true
     };
     if (type === 'select') newField.options = ['选项1', '选项2'];

     setActiveTemplate({
        ...activeTemplate,
        fields: [...activeTemplate.fields, newField]
     });
  };

  const updateField = (id: string, key: string, value: any) => {
     if (!activeTemplate) return;
     setActiveTemplate({
        ...activeTemplate,
        fields: activeTemplate.fields.map(f => f.id === id ? { ...f, [key]: value } : f)
     });
  };

  const removeField = (id: string) => {
      if (!activeTemplate) return;
      setActiveTemplate({
        ...activeTemplate,
        fields: activeTemplate.fields.filter(f => f.id !== id)
      });
  }

  const saveTemplate = async () => {
     if (!activeTemplate) return;
     try {
        const res = await fetch('/api/workflow/forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: activeTemplate.id,
                name: activeTemplate.name,
                code: activeTemplate.code,
                schema: activeTemplate.fields
            })
        });
        if (res.ok) {
            const saved = await res.json();
            setActiveTemplate({ ...activeTemplate, id: saved.id });
            alert('表单模板保存成功');
            // refresh list
            const listRes = await fetch('/api/workflow/forms');
            const listData = await listRes.json();
            if (Array.isArray(listData)) setTemplates(listData);
        }
     } catch(e) {
         console.error('Failed to save', e);
         alert('保存失败');
     }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
       {/* Left Sidebar: List of Forms */}
       <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
             <h2 className="font-semibold text-gray-800">业务表单管理</h2>
             <button onClick={createNew} className="p-1 hover:bg-gray-100 rounded text-blue-600"><PlusCircle className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
             {templates.map(t => (
                 <div
                   key={t.id}
                   onClick={() => setActiveTemplate({ id: t.id, name: t.name, code: t.code, fields: t.schema || [] })}
                   className={`p-3 rounded mb-1 cursor-pointer flex items-center gap-2 ${activeTemplate?.id === t.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100 border border-transparent'}`}
                 >
                    <FileText className={`w-4 h-4 ${activeTemplate?.id === t.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-700 truncate">{t.name}</span>
                 </div>
             ))}
          </div>
       </div>

       {/* Main Canvas: Form Editor */}
       <div className="flex-1 flex flex-col">
          {!activeTemplate ? (
             <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
                 <FormInput className="w-16 h-16 opacity-20" />
                 <p>选择左侧表单或点击 "+" 创建新模板，用于绑定流程节点</p>
             </div>
          ) : (
             <>
                 <div className="p-4 bg-white border-b flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={activeTemplate.name}
                          onChange={e => setActiveTemplate({...activeTemplate, name: e.target.value})}
                          className="text-xl font-bold border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent"
                        />
                        <span className="text-xs text-gray-400 font-mono">编码: {activeTemplate.code}</span>
                    </div>
                    <button onClick={saveTemplate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                        <Save className="w-4 h-4" /> 保存表单
                    </button>
                 </div>

                 <div className="flex-1 flex overflow-hidden">
                    {/* Middle: Canvas */}
                    <div className="flex-1 p-6 overflow-y-auto bg-gray-100">
                        <div className="max-w-2xl mx-auto bg-white border border-gray-200 shadow-sm rounded-xl p-8 min-h-[500px]">
                            <h2 className="text-2xl font-bold text-center mb-8 border-b pb-4">{activeTemplate.name}</h2>
                            {activeTemplate.fields.length === 0 ? (
                                <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded">
                                    从右侧拖拽或点击添加字段
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {activeTemplate.fields.map((field, index) => (
                                        <div key={field.id} className="relative group border border-transparent hover:border-blue-200 hover:bg-blue-50 p-4 rounded -mx-4 transition-colors">
                                            <div className="flex gap-4">
                                                <div className="w-1/3 text-right pt-2">
                                                    <label className="text-sm font-medium text-gray-700">
                                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                                    </label>
                                                </div>
                                                <div className="flex-1">
                                                    {field.type === 'text' && <input type="text" disabled placeholder="文本输入框 (运行时)" className="w-full border border-gray-300 rounded p-2 bg-gray-50 text-gray-400" />}
                                                    {field.type === 'number' && <input type="number" disabled placeholder="数字输入框 (运行时)" className="w-full border border-gray-300 rounded p-2 bg-gray-50 text-gray-400" />}
                                                    {field.type === 'date' && <input type="date" disabled className="w-full border border-gray-300 rounded p-2 bg-gray-50 text-gray-400" />}
                                                    {field.type === 'select' && (
                                                        <select disabled className="w-full border border-gray-300 rounded p-2 bg-gray-50 text-gray-400">
                                                            {field.options?.map(o => <option key={o}>{o}</option>)}
                                                        </select>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Field Editor Config Inline */}
                                            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <input
                                                    type="text"
                                                    value={field.label}
                                                    onChange={e => updateField(field.id, 'label', e.target.value)}
                                                    className="border text-sm p-1 rounded"
                                                    placeholder="字段名称"
                                                 />
                                                 <label className="flex items-center gap-1 text-sm text-gray-600">
                                                     <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, 'required', e.target.checked)} /> 必填
                                                 </label>
                                                 {field.type === 'select' && (
                                                     <input
                                                        type="text"
                                                        value={field.options?.join(',')}
                                                        onChange={e => updateField(field.id, 'options', e.target.value.split(','))}
                                                        className="border text-sm p-1 rounded w-48"
                                                        placeholder="选项(逗号分隔)"
                                                     />
                                                 )}
                                                 <button onClick={() => removeField(field.id)} className="text-red-500 text-xs ml-auto hover:underline">删除字段</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Controls */}
                    <div className="w-64 border-l bg-white p-4">
                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Settings className="w-4 h-4"/> 控件库</h3>
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => addField('text')} className="border rounded p-2 text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600 bg-gray-50">单行文本</button>
                             <button onClick={() => addField('number')} className="border rounded p-2 text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600 bg-gray-50">数字金额</button>
                             <button onClick={() => addField('date')} className="border rounded p-2 text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600 bg-gray-50">日期时间</button>
                             <button onClick={() => addField('select')} className="border rounded p-2 text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600 bg-gray-50">下拉选项</button>
                        </div>
                        <div className="mt-8 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
                            提示：创建好的表单可以在 <b>流程引擎设计器</b> 中被绑定。数字金额字段可用于网关节点的流转条件判断。
                        </div>
                    </div>
                 </div>
             </>
          )}
       </div>
    </div>
  );
}
