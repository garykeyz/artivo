"""Payment boundary. Replace with a hosted checkout + verified webhooks for live money."""
from typing import Protocol
import secrets
from .security import APIError

class PaymentProvider(Protocol):
    def collect(self,booking_id:int,amount:int)->dict: ...
    def release(self,reference:str)->None: ...
    def refund(self,reference:str)->None: ...

class DemoPaymentProvider:
    def collect(self,booking_id,amount):
        return {'provider':'DEMO','reference':f'demo_{booking_id}_{secrets.token_hex(8)}','amount':amount,'status':'HELD'}
    def release(self,reference): pass
    def refund(self,reference): pass

class DisabledPaymentProvider:
    def collect(self,*args): raise APIError('Conecta un proveedor de pagos antes de cobrar.',503)
    def release(self,*args): raise APIError('Proveedor de pagos no configurado.',503)
    def refund(self,*args): raise APIError('Proveedor de pagos no configurado.',503)
