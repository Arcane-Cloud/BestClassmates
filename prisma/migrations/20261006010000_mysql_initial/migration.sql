-- CreateTable
CREATE TABLE `people` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `nickname` VARCHAR(60) NOT NULL DEFAULT '',
    `slug` VARCHAR(80) NOT NULL,
    `biography` TEXT NOT NULL,
    `avatar` TEXT NOT NULL,
    `portrait` TEXT NOT NULL,
    `background` TEXT NOT NULL,
    `accent_color` VARCHAR(7) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(12) NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `people_slug_key`(`slug`),
    INDEX `people_public_order_idx`(`status`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admins` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `password_hash` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `token_hash` VARCHAR(64) NOT NULL,
    `admin_id` CHAR(36) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `session_expiry_idx`(`expires_at`),
    PRIMARY KEY (`token_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_attempts` (
    `key` VARCHAR(64) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 1,
    `reset_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_uploads` (
    `id` CHAR(36) NOT NULL,
    `admin_id` CHAR(36) NOT NULL,
    `expected_bytes` INTEGER NOT NULL,
    `mime_type` VARCHAR(32) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `completed_at` DATETIME(3) NULL,

    INDEX `media_uploads_expiry_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_uploads` ADD CONSTRAINT `media_uploads_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
