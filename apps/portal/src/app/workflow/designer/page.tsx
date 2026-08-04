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
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [availableForms, setAvailableForms] = useState<unknown[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  useEffect(() => {
     fetch('/api/workflow/forms').then(res => res.json()).then(data => {
         if (Array.isArray(data)) setAvailableForms(data);
     }).catch(console.error);
  }, []);

  // Sync selected node data when nodes change
  useEffect(() => {
    if (selectedNode) {
      const updatedNode = nodes.find((n) => n.id === selectedNode.id);
      if (updatedNode) setSelectedNode(updatedNode);
    }
  }, [nodes, selectedNode]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, type: 'step' }, eds)),
    [setEdges]
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const onPaneClick = () => {
    setSelectedNode(null);
  };

  const addNode = () => {
    const newNodeId = `node_${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id: newNodeId,
        position: { x: 300, y: 250 },
        data: { label: '新建审批节点', assigneeStrategy: 'SPECIFIC_ROLE', signType: 'OR_SIGN' },
      },
    ]);
  };

  const addGateway = () => {
    const newNodeId = `gateway_${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id: newNodeId,
        position: { x: 450, y: 250 },
        data: { label: '条件分支', gatewayType: 'EXCLUSIVE' },
        style: {
          background: '#FFF3E0',
          border: '1px solid #FFB74D',
          borderRadius: '50%',
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
      },
    ]);
  };

  const updateNodeData = (key: string, value: unknown) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          return {
            ...n,
            data: {
              ...n.data,
              [key]: value,
            },
          };
        }
        return n;
      })
    );
  };

  const saveWorkflow = async () => {
    try {
      // In a real implementation we would pick form template id, workflow name etc from UI.
      const res = await fetch('/api/workflow/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeWorkflowId,
          name: '复杂业务审批流',
          code: 'FLOW_' + Date.now(),
          nodes: nodes,
          edges: edges,
          version: 1, formTemplateId: selectedFormId })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveWorkflowId(data.id);
        alert('流程新版本保存并发布成功！');
      }
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  const simulateWorkflow = async () => {
      alert("流程路径预测与仿真模式已启动！(功能实现中)");
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            流程引擎设计器 V2 (BPMN)
          </h1>
          <p className="text-sm text-gray-500">支持节点策略配置、网关条件、会签或签与表单绑定。</p>
        </div>
        <div className="flex gap-2">
           <select
            value={selectedFormId || ''}
            onChange={e => setSelectedFormId(e.target.value)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 text-gray-700 max-w-[200px]"
          >
             <option value="">未绑定表单</option>
             {availableForms.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
             ))}
          </select>
          <button onClick={addNode} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
            <PlusCircle className="w-4 h-4 text-blue-600" /> 添加任务节点
          </button>
          <button onClick={addGateway} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
            <GitMerge className="w-4 h-4 text-orange-600" /> 添加分支网关
          </button>
          <button onClick={simulateWorkflow} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
            <Play className="w-4 h-4 text-green-600" /> 预测模拟
          </button>
          <button onClick={saveWorkflow} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 shadow">
            <Save className="w-4 h-4" /> 保存版本
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
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            attributionPosition="bottom-right"
          >
            <Controls />
            <MiniMap zoomable pannable />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto flex flex-col gap-6">
            <h3 className="font-semibold border-b pb-2 text-gray-800">
              {selectedNode.type === 'input' ? '发起节点属性' :
               selectedNode.id.startsWith('gateway') ? '网关属性' : '任务节点属性'}
            </h3>

            {/* Common: Label */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">节点名称</label>
              <input
                type="text"
                value={selectedNode.data.label || ''}
                onChange={(e) => updateNodeData('label', e.target.value)}
                className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Task specific properties */}
            {!selectedNode.id.startsWith('gateway') && selectedNode.type !== 'input' && selectedNode.type !== 'output' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">处理人寻找策略 (Assignee Strategy)</label>
                  <select
                    value={selectedNode.data.assigneeStrategy || 'DIRECT_MANAGER'}
                    onChange={(e) => updateNodeData('assigneeStrategy', e.target.value)}
                    className="w-full border rounded p-2 text-sm"
                  >
                    <option value="DIRECT_MANAGER">相对：发起人的直接主管</option>
                    <option value="DEPT_HEAD">相对：发起人的部门负责人</option>
                    <option value="SPECIFIC_ROLE">指定：特定系统角色 (如HRBP)</option>
                    <option value="SPECIFIC_USER">指定：特定员工</option>
                    <option value="FORM_VARIABLE">动态：根据表单字段 (如 项目经理)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">多人办理方式 (Sign Type)</label>
                  <select
                    value={selectedNode.data.signType || 'OR_SIGN'}
                    onChange={(e) => updateNodeData('signType', e.target.value)}
                    className="w-full border rounded p-2 text-sm"
                  >
                    <option value="OR_SIGN">或签 (一名处理人同意即可)</option>
                    <option value="AND_SIGN">会签 (须所有处理人同意)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">允许的审批动作</label>
                  <div className="flex flex-col gap-2 mt-2 bg-white p-3 border rounded">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" defaultChecked /> 同意 (Approve)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" defaultChecked /> 驳回到发起人 (Reject to Start)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" /> 驳回到上一节点 (Reject to Prev)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" /> 允许转办委派 (Delegation)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">节点完成后触发 (Webhook / Actions)</label>
                  <input type="text" placeholder="https://api.yourdomain.com/webhook" className="w-full border rounded p-2 text-sm mb-1" />
                  <p className="text-[10px] text-gray-400">审批同意后系统自动调用的接口URL</p>
                </div>
              </>
            )}

            {/* Gateway specific properties */}
            {selectedNode.id.startsWith('gateway') && (
              <div>
                 <label className="block text-xs font-medium text-gray-600 mb-1">网关类型</label>
                 <select
                    value={selectedNode.data.gatewayType || 'EXCLUSIVE'}
                    onChange={(e) => updateNodeData('gatewayType', e.target.value)}
                    className="w-full border rounded p-2 text-sm"
                  >
                    <option value="EXCLUSIVE">排他网关 (XOR) - 仅走满足条件的一条线</option>
                    <option value="PARALLEL">并行网关 (AND) - 同时流向所有分支</option>
                  </select>
                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded">
                    提示：请点击连接网关外出的 <b>连线(Edge)</b> 设置流转条件 (如: 金额 &gt; 5000)。
                  </div>
              </div>
            )}
          </div>
        )}

        {!selectedNode && (
          <div className="w-80 border-l bg-gray-50 p-4 flex items-center justify-center text-gray-400 text-sm">
            点击节点或连线查看配置属性
          </div>
        )}
      </div>
    </div>
  );
}
