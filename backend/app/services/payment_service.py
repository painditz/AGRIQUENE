import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from ..models.models import Payment, PaymentStatus, ProcurementRecord, Farmer

class PaymentService:
    @staticmethod
    def create_payment_for_procurement(
        db: Session,
        procurement: ProcurementRecord,
        farmer: Farmer
    ) -> Payment:
        # Generate PFMS/DBT transaction reference
        txn_ref = f"DBT-PFMS-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        utr_ref = f"UTR{uuid.uuid4().hex[:12].upper()}"
        
        payment = Payment(
            procurement_id=procurement.id,
            farmer_id=farmer.id,
            transaction_ref=txn_ref,
            amount=procurement.total_amount,
            payment_mode="Direct Benefit Transfer (PFMS / Aadhaar DBT)",
            status=PaymentStatus.PROCESSING,
            bank_account_masked=farmer.bank_account_masked,
            bank_name="State Bank of India",
            utr_number=utr_ref,
            initiated_at=datetime.utcnow()
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def mark_payment_completed(db: Session, payment_id: int) -> Optional[Payment]:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if payment:
            payment.status = PaymentStatus.COMPLETED
            payment.completed_at = datetime.utcnow()
            db.commit()
            db.refresh(payment)
        return payment

payment_service = PaymentService()
