/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { actionType, operatorId, remark, newEndDate } = await req.json();
    const contractId = params.id;

    const contract = await prisma.laborContract.findUnique({
        where: { id: contractId }
    });

    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

    if (actionType === 'SIGN') {
        if (contract.status !== 'DRAFT' && contract.status !== 'PENDING_SIGN') {
            return NextResponse.json({ error: "Invalid status for SIGN" }, { status: 400 });
        }
        await prisma.laborContract.update({
            where: { id: contractId },
            data: { status: 'ACTIVE', signDate: new Date() }
        });
    } else if (actionType === 'RENEW') {
        if (contract.status !== 'ACTIVE' && contract.status !== 'EXPIRED') {
            return NextResponse.json({ error: "Only ACTIVE or EXPIRED contracts can be renewed" }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            // End old contract
            await tx.laborContract.update({
                where: { id: contractId },
                data: { status: 'TERMINATED' }
            });
            // Create new contract
            await tx.laborContract.create({
                data: {
                    code: 'HT_R_' + Date.now(),
                    employeeId: contract.employeeId,
                    templateId: contract.templateId,
                    signDate: new Date(),
                    startDate: new Date(),
                    endDate: new Date(newEndDate || new Date().setFullYear(new Date().getFullYear() + 1)),
                    status: 'DRAFT'
                }
            });
        });
    } else if (actionType === 'TERMINATE') {
        if (contract.status === 'TERMINATED') {
            return NextResponse.json({ error: "Already terminated" }, { status: 400 });
        }
        await prisma.laborContract.update({
            where: { id: contractId },
            data: { status: 'TERMINATED' }
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process contract action" }, { status: 500 });
  }
}
