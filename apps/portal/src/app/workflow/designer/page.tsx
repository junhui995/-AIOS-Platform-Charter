"use client";

import React, { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, PlusCircle, Settings, Play } from 'lucide-react';

const initialNodes = [
  { id: 'start', position: { x: 250, y: 50 }, data: { label: '发起节点 (Start)' }, type: 'input' },
  { id: '1', position: { x: 250, y: 150 }, data: { label: '直接主管审批' } },
  { id: 'end', position: { x: 250, y: 250 }, data: { label: '结束归档 (End)' }, type: 'output' },
];

const initialEdges = [
  { id: 'e-start-1', source: 'start', target: '1' },
  { id: 'e-1-end', source: '1', target: 'end' }
];

export default function WorkflowDesignerPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = () => {
    const newNodeId = `node_${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id: newNodeId,
        position: { x: 300, y: 150 },
        data: { label: '新建审批节点' },
      },
    ]);
  };

  const saveWorkflow = async () => {
    try {
      const res = await fetch('/api/workflow/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeWorkflowId,
          name: '请假审批流 (Dev)',
          nodes: nodes,
          edges: edges
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveWorkflowId(data.id);
        alert('流程保存成功');
      }
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            流程引擎设计器
          </h1>
          <p className="text-sm text-gray-500">拖拉拽连线，配置业务表单审批流转规则。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addNode} className="flex items-center gap-2 px-4 py-2 bg-white border rounded text-sm hover:bg-gray-50">
            <PlusCircle className="w-4 h-4" /> 添加节点
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded text-sm hover:bg-gray-50">
            <Play className="w-4 h-4 text-green-600" /> 模拟运行
          </button>
          <button onClick={saveWorkflow} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 shadow">
            <Save className="w-4 h-4" /> 保存发布
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-inner flex relative">
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            attributionPosition="bottom-right"
          >
            <Controls />
            <MiniMap zoomable pannable />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </div>
        <div className="w-80 border-l bg-gray-50 p-4">
          <h3 className="font-semibold mb-4 border-b pb-2">节点属性配置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">节点名称</label>
              <input type="text" className="w-full border rounded p-2 text-sm" placeholder="如：部门经理审批" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">办理人维度 (组织架构)</label>
              <select className="w-full border rounded p-2 text-sm">
                <option>相对角色：发起人直接主管</option>
                <option>指定岗位：HRBP</option>
                <option>指定系统角色：法务管理员</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">审批动作配置</label>
              <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> 允许同意</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> 允许驳回至发起人</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> 允许转办</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
