from sqlalchemy import text
from sqlalchemy.orm import Session


def get_balances_for_user(user_id: str, db: Session, group_id: str | None = None) -> dict[str, float]:
    """
    Returns a dict of {other_user_id: net_balance} for a given user.
    Positive = other person owes current user.
    Negative = current user owes other person.
    """
    group_filter = "AND e.group_id = :group_id" if group_id else ""

    # What others owe the current user (current user paid)
    owed_to_me = db.execute(text(f"""
        SELECT ep.user_id::text, SUM(ep.owed_amount) as total
        FROM expense_participants ep
        JOIN expenses e ON e.id = ep.expense_id
        WHERE e.paid_by = :user_id
          AND ep.user_id != :user_id
          AND e.deleted_at IS NULL
          {group_filter}
        GROUP BY ep.user_id
    """), {"user_id": user_id, "group_id": group_id}).fetchall()

    # What current user owes others
    i_owe = db.execute(text(f"""
        SELECT e.paid_by::text, SUM(ep.owed_amount) as total
        FROM expense_participants ep
        JOIN expenses e ON e.id = ep.expense_id
        WHERE ep.user_id = :user_id
          AND e.paid_by != :user_id
          AND e.deleted_at IS NULL
          {group_filter}
        GROUP BY e.paid_by
    """), {"user_id": user_id, "group_id": group_id}).fetchall()

    # Settlements: current user paid someone
    settlements_paid = db.execute(text(f"""
        SELECT payee_id::text, SUM(amount) as total
        FROM settlements
        WHERE payer_id = :user_id
          {("AND group_id = :group_id" if group_id else "")}
        GROUP BY payee_id
    """), {"user_id": user_id, "group_id": group_id}).fetchall()

    # Settlements: someone paid current user
    settlements_received = db.execute(text(f"""
        SELECT payer_id::text, SUM(amount) as total
        FROM settlements
        WHERE payee_id = :user_id
          {("AND group_id = :group_id" if group_id else "")}
        GROUP BY payer_id
    """), {"user_id": user_id, "group_id": group_id}).fetchall()

    balances: dict[str, float] = {}

    for row in owed_to_me:
        balances[row[0]] = balances.get(row[0], 0) + float(row[1])

    for row in i_owe:
        balances[row[0]] = balances.get(row[0], 0) - float(row[1])

    for row in settlements_paid:
        balances[row[0]] = balances.get(row[0], 0) + float(row[1])

    for row in settlements_received:
        balances[row[0]] = balances.get(row[0], 0) - float(row[1])

    return balances
