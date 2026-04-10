import asyncio
from datetime import datetime, timedelta

from sqlalchemy import delete, select

from app.database import AsyncSessionLocal, init_db
from app.models.machine import Machine
from app.models.order import Order
from app.models.routing import Routing, RoutingOperation
from app.models.schedule import Schedule, ScheduleItem
from app.models.task import ScheduleTask


async def seed() -> None:
    await init_db()

    async with AsyncSessionLocal() as db:
        await db.execute(delete(ScheduleItem))
        await db.execute(delete(Schedule))
        await db.execute(delete(ScheduleTask))
        await db.execute(delete(RoutingOperation))
        await db.execute(delete(Routing))
        await db.execute(delete(Order))
        await db.execute(delete(Machine))
        await db.commit()

        machines = [
            Machine(
                code="MC-001",
                name="CNC-1",
                type="CNC",
                status="idle",
                capacity_per_day=480,
            ),
            Machine(
                code="MC-002",
                name="Drill-1",
                type="DRILL",
                status="idle",
                capacity_per_day=480,
            ),
        ]
        db.add_all(machines)
        await db.commit()

        result = await db.execute(select(Machine).order_by(Machine.id))
        machines = list(result.scalars().all())

        orders = [
            Order(
                order_no="ORD-1001",
                product_name="Gear Shaft",
                quantity=20,
                priority=2,
                due_date=datetime.utcnow() + timedelta(days=5),
                status="pending",
            ),
            Order(
                order_no="ORD-1002",
                product_name="Pump Housing",
                quantity=10,
                priority=1,
                due_date=datetime.utcnow() + timedelta(days=7),
                status="pending",
            ),
        ]
        db.add_all(orders)
        await db.commit()

        result = await db.execute(select(Order).order_by(Order.id))
        orders = list(result.scalars().all())

        routing_a = Routing(order_id=orders[0].id, name="Gear Shaft Routing")
        routing_b = Routing(order_id=orders[1].id, name="Pump Housing Routing")
        db.add_all([routing_a, routing_b])
        await db.commit()

        result = await db.execute(select(Routing).order_by(Routing.id))
        routings = list(result.scalars().all())

        operations = [
            RoutingOperation(
                routing_id=routings[0].id,
                seq_no=1,
                operation_name="Turning",
                machine_id=machines[0].id,
                process_time=1.5,
                setup_time=0.5,
            ),
            RoutingOperation(
                routing_id=routings[0].id,
                seq_no=2,
                operation_name="Drilling",
                machine_id=machines[1].id,
                process_time=0.8,
                setup_time=0.2,
            ),
            RoutingOperation(
                routing_id=routings[1].id,
                seq_no=1,
                operation_name="Milling",
                machine_id=machines[0].id,
                process_time=2.0,
                setup_time=0.4,
            ),
            RoutingOperation(
                routing_id=routings[1].id,
                seq_no=2,
                operation_name="Finishing",
                machine_id=machines[1].id,
                process_time=1.2,
                setup_time=0.3,
            ),
        ]
        db.add_all(operations)
        await db.commit()

    print("Seed completed.")


if __name__ == "__main__":
    asyncio.run(seed())
