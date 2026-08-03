"use client";

import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, PlusCircle, Settings, Play, GitMerge, FileText } from 'lucide-react';

const initialNodes: Node[] = [
  { id: 'start', position: { x: 250, y: 50 }, data: { label: '发起节点 (Start)' }, type: 'input' },
  { id: '1', position: { x: 250, y: 150 }, data: { label: '直接主管审批', assigneeStrategy: 'DIRECT_MANAGER', signType: 'OR_SIGN' } },
  { id: 'end', position: { x: 250, y: 350 }, data: { label: '结束归档 (End)' }, type: 'output' },
];

const initialEdges: Edge[] = [
  { id: 'e-start-1', source: 'start', target: '1' },
  { id: 'e-1-end', source: '1', target: 'end' }
];

export default function WorkflowDesignerPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">流程引擎配置 (Workflow Designer)</h1>
      <p className="text-gray-500">TODO: 集成 React Flow 实现拖拉拽流程节点配置</p>
    </div>
  );
}
