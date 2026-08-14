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
            data: { status: 'ACTIVE', signDate: new Date(), effectiveDate: new Date() }
        });
    } else if (actionType === 'RENEW') {
        if (contract.status !== 'ACTIVE' && contract.status !== 'EXPIRED') {
            return NextResponse.json({ error: "Only ACTIVE or EXPIRED contracts can be renewed" }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            // End old contract
            await tx.laborContract.update({
                where: { id: contractId },
                data: { status: 'TERMINATED', remark: (contract.remark || '') + ' [Renewed]' }
            });
            // Create new contract
            await tx.laborContract.create({
                data: {
                    code: 'HT_R_' + Date.now(),
                    employeeId: contract.employeeId,
                    templateId: contract.templateId,
                    contractType: contract.contractType,
                    startDate: new Date(),
                    endDate: new Date(newEndDate || new Date().setFullYear(new Date().getFullYear() + 1)),
                    probationMonths: 0,
                    salary: contract.salary,
                    position: contract.position,
                    department: contract.department,
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
            data: { status: 'TERMINATED', remark: (contract.remark || '') + ' [Terminated manually]' }
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process contract action" }, { status: 500 });
  }
}
