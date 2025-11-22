import {type StatsCardProps } from '../../types';
import styles from './StatsCard.module.css';

const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    color = 'blue'
}) => {
    return(
        <div className={`${styles.card} ${styles[color]}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>{title}</h3>
                {icon && <span className={styles.icon}>{icon}</span>}
            </div>
            <div className={styles.value}>{value}</div>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
    );
};

export default StatsCard;