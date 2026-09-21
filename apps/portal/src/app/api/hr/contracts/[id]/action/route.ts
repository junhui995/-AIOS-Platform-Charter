import { NextResponse } from 'next/server';
import { contractRepository } from '@aios/data-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { actionType, newEndDate } = await req.json();
    const contractId = params.id;

    const contract = await contractRepository.findById(contractId);
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    if (actionType === 'SIGN') {
      if (contract.status !== 'DRAFT' && contract.status !== 'PENDING_SIGN') {
        return NextResponse.json({ error: 'Invalid status for SIGN' }, { status: 400 });
      }
      await contractRepository.updateStatus(contractId, 'ACTIVE', new Date());
    } else if (actionType === 'RENEW') {
      if (contract.status !== 'ACTIVE' && contract.status !== 'EXPIRED') {
        return NextResponse.json({ error: 'Only ACTIVE or EXPIRED contracts can be renewed' }, { status: 400 });
      }
      await contractRepository.renew(contractId, newEndDate);
    } else if (actionType === 'TERMINATE') {
      if (contract.status === 'TERMINATED') {
        return NextResponse.json({ error: 'Already terminated' }, { status: 400 });
      }
      await contractRepository.updateStatus(contractId, 'TERMINATED');
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to process contract action' }, { status: 500 });
  }
}