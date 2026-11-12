IF COL_LENGTH('dbo.usuario', 'mfa_habilitado') IS NULL
BEGIN
    ALTER TABLE dbo.usuario
    ADD mfa_habilitado BIT NOT NULL
        CONSTRAINT DF_usuario_mfa_habilitado DEFAULT 0;
END;
GO

IF COL_LENGTH('dbo.usuario', 'mfa_secreto_encriptado') IS NULL
BEGIN
    ALTER TABLE dbo.usuario
    ADD mfa_secreto_encriptado NVARCHAR(1000) NULL;
END;
GO

IF COL_LENGTH('dbo.usuario', 'mfa_configuracion_pendiente') IS NULL
BEGIN
    ALTER TABLE dbo.usuario
    ADD mfa_configuracion_pendiente BIT NOT NULL
        CONSTRAINT DF_usuario_mfa_configuracion_pendiente DEFAULT 0;
END;
GO

IF COL_LENGTH('dbo.usuario', 'mfa_fecha_activacion') IS NULL
BEGIN
    ALTER TABLE dbo.usuario
    ADD mfa_fecha_activacion DATETIME2 NULL;
END;
GO
