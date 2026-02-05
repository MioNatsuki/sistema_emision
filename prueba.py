import bcrypt

# Nueva contraseña en texto plano
new_password = b"Admin123!"

# Generar un nuevo hash
new_hash = bcrypt.hashpw(new_password, bcrypt.gensalt())

print(new_hash.decode())  # Este es el valor que debes guardar en la BD
