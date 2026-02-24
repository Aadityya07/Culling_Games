import os
os.environ["DATABASE_URL"] = "postgresql://postgres.xsenzrhrnflmqlyhpern:Aditya_Yadav@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
from app import create_app
from app.extensions import db
from app.models import User
from app.auth.utils import hash_password

app = create_app()

with app.app_context():
    existing = User.query.filter_by(email="uzumakiaditya433@gmail.com").first()

    if existing:
        print("Super Master already exists.")
    else:
        master = User(
            name="Super Admin",
            email="uzumakiaditya433@gmail.com",
            password_hash=hash_password("9766282543"),
            role="MASTER"
        )

        db.session.add(master)
        db.session.commit()

        print("Super Master created successfully.")
