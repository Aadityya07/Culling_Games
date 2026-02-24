from app.services.coordinator_assignment_service import rebalance_all_teams
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.middleware.role_required import role_required
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from datetime import datetime, timedelta
from app.models import ActiveSession
from .utils import verify_password
from app.extensions import db
from app.models import User
from .utils import hash_password
from app.models import GameState


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    state = GameState.query.first()

    if state and not state.registration_open:
        return jsonify({
            "error": "Registration is closed"
        }), 403

    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not all([name, email, password, role]):
        return jsonify({"error": "All fields are required"}), 400

    if role != "TEAM":
        return jsonify({"error": "Only TEAM registration allowed"}), 403


    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 400

    hashed_password = hash_password(password)

    new_user = User(
        name=name,
        email=email,
        password_hash=hashed_password,
        role=role
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not verify_password(password, user.password_hash):
        return jsonify({"error": "Invalid credentials"}), 401

    # Generate JWT token
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role}
    )

    # Extract JTI safely
    from flask_jwt_extended import decode_token
    decoded = decode_token(access_token)
    jti = decoded["jti"]

    # Delete ONLY this user's old sessions
    ActiveSession.query.filter(
        ActiveSession.user_id == user.id
    ).delete()

    # Create new session with 2-hour expiry (ONLY CHANGE)
    new_session = ActiveSession(
        user_id=user.id,
        jwt_id=jti,
        expires_at=datetime.utcnow() + timedelta(hours=4)
    )

    db.session.add(new_session)
    db.session.commit()

    return jsonify({
        "access_token": access_token,
        "user_id": user.id,
        "role": user.role
    }), 200


@auth_bp.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    current_user_id = get_jwt_identity()
    return jsonify({
        "message": "Protected route accessed",
        "user_id": current_user_id
    }), 200


@auth_bp.route("/master-only", methods=["GET"])
@role_required("MASTER")
def master_only():
    return jsonify({"message": "Welcome Master"}), 200


@auth_bp.route("/team-only", methods=["GET"])
@role_required("TEAM")
def team_only():
    return jsonify({"message": "Welcome Team"}), 200


@auth_bp.route("/create-admin", methods=["POST"])
@role_required("MASTER")
def create_admin():
    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not all([name, email, password, role]):
        return jsonify({"error": "All fields required"}), 400

    if role not in ["MASTER", "COORDINATOR"]:
        return jsonify({"error": "Invalid role for admin creation"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "Email already exists"}), 400

    new_user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role
    )

    db.session.add(new_user)
    db.session.commit()

    # Rebalance teams if coordinator added
    if role == "COORDINATOR":
        rebalance_all_teams()

    return jsonify({
        "message": f"{role} created successfully"
    }), 201


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():

    jwt_data = get_jwt()
    jti = jwt_data["jti"]

    session = ActiveSession.query.filter_by(jwt_id=jti).first()

    if session:
        db.session.delete(session)
        db.session.commit()

    return jsonify({
        "message": "Logged out successfully"
    }), 200
